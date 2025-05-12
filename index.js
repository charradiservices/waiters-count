const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');


const config = {
  port: 5551,
  mongodb: {
    uri: "mongodb://charradiservices.ma:26000/",
    databases: {
      tls: "tls_database",
      dashboard: "dashboard"
    }
  }
};

class DatabaseConnection {
  constructor() {
    this.connections = {};
  }

  async connect(dbName) {
    try {
      const client = await MongoClient.connect(config.mongodb.uri);
      console.log(`Connected to MongoDB database: ${dbName}`);
      this.connections[dbName] = client.db(dbName);
      return this.connections[dbName];
    } catch (error) {
      console.error(`Failed to connect to MongoDB database ${dbName}:`, error);
      throw error;
    }
  }

  getDatabase(dbName) {
    return this.connections[dbName];
  }
}

class WaiterService {
  constructor(db) {
    this.allWaitersCollection = db.collection("all_waiters");
  }

  async getWaiterCount(city) {
    return await this.allWaitersCollection.countDocuments({ city });
  }

  async getGroupedWaiters() {
    return await this.allWaitersCollection.aggregate([
      {
        $group: {
          _id: { city: "$city", cas: "$cas" },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "all_waiters",
          let: { city: "$_id.city", cas: "$_id.cas" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$city", "$$city"] },
                    { $eq: ["$cas", "$$cas"] }
                  ]
                },
                is_booked: true
              }
            },
            {
              $group: {
                _id: "$acc_type",
                bookedCount: { $sum: 1 }
              }
            }
          ],
          as: "bookedData"
        }
      },
      {
        $lookup: {
          from: "all_waiters",
          let: { city: "$_id.city", cas: "$_id.cas" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$city", "$$city"] },
                    { $eq: ["$cas", "$$cas"] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: "$acc_type",
                accTypeCount: { $sum: 1 }
              }
            }
          ],
          as: "accTypeData"
        }
      },
      {
        $addFields: {
          bookedCounts: {
            $map: {
              input: ["indi", "family"],
              as: "type",
              in: {
                type: "$$type",
                count: {
                  $ifNull: [
                    {
                      $reduce: {
                        input: {
                          $filter: {
                            input: "$bookedData",
                            as: "bd",
                            cond: { $eq: ["$$bd._id", "$$type"] }
                          }
                        },
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this.bookedCount"] }
                      }
                    },
                    0
                  ]
                }
              }
            }
          },
          accTypeCounts: "$accTypeData"
        }
      },
      {
        $sort: { "_id.city": 1, "_id.cas": 1 }
      },
      {
        $project: {
          bookedData: 0,
          accTypeData: 0
        }
      }
    ]).toArray();
  }
}

class TreatedGroupService {
  constructor(db) {
    this.treatedGroupsCollection = db.collection("treatedGroups");
  }

  async getTreatedGroups() {
    return await this.treatedGroupsCollection.find({}).toArray();
  }

  async updateTreatedStatus(city, cas, treated) {
    return await this.treatedGroupsCollection.updateOne(
      { city, cas },
      { $set: { treated, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async resetTreatedGroups() {
    return await this.treatedGroupsCollection.deleteMany({});
  }

  scheduleReset() {
    const calculateNextReset = () => {
      const now = new Date();
      const nextReset = new Date();
      nextReset.setHours(6, 0, 0, 0);
      if (now >= nextReset) {
        nextReset.setDate(nextReset.getDate() + 1);
      }
      return nextReset - now;
    };

    const resetAndScheduleNext = async () => {
      try {
        await this.resetTreatedGroups();
        console.log("Treated groups reset at 6 AM.");
      } catch (error) {
        console.error("Failed to reset treated groups:", error.message);
      }
      setTimeout(resetAndScheduleNext, calculateNextReset());
    };

    setTimeout(resetAndScheduleNext, calculateNextReset());
  }
}


const createRouteHandlers = (waiterService, treatedGroupService) => {
  const router = express.Router();

  router.get("/waiters/count/:city", async (req, res) => {
    try {
      const count = await waiterService.getWaiterCount(req.params.city);
      res.json({ city: req.params.city, count });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching the count" });
    }
  });

  router.get("/waiters/grouped", async (req, res) => {
    try {
      const groupedWaiters = await waiterService.getGroupedWaiters();
      res.json(groupedWaiters);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while grouping waiters" });
    }
  });

  router.get("/waiters/treated", async (req, res) => {
    try {
      const groups = await treatedGroupService.getTreatedGroups();
      res.status(200).json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch treated groups" });
    }
  });

  router.post("/waiters/treated", async (req, res) => {
    const { city, cas, treated } = req.body;

    if (!city || !cas || typeof treated !== "boolean") {
      return res.status(400).json({ error: "Invalid request data" });
    }

    try {
      const result = await treatedGroupService.updateTreatedStatus(city, cas, treated);
      res.status(200).json({ message: "Treated status updated successfully", result });
    } catch (error) {
      res.status(500).json({ error: "Failed to update treated status" });
    }
  });

  return router;
};

const setupApp = async () => {

  const app = express();
  app.use(cors({
    origin: 'https://app.charradiservices.ma',
    credentials: true,
  }));
  app.use(bodyParser.json());

  // Initialize database connections
  const dbConnection = new DatabaseConnection();
  try {
    const tlsDb = await dbConnection.connect(config.mongodb.databases.tls);
    const dashboardDb = await dbConnection.connect(config.mongodb.databases.dashboard);

    // Initialize services
    const waiterService = new WaiterService(tlsDb);
    const treatedGroupService = new TreatedGroupService(dashboardDb);

    // Setup routes
    app.use("/", createRouteHandlers(waiterService, treatedGroupService));

    // Schedule treated groups reset
    treatedGroupService.scheduleReset();

    // Load SSL certificate and key
    const sslOptions = {
      key: fs.readFileSync('./cert/server.key'),
      cert: fs.readFileSync('./cert/server.crt')  // Include intermediates!
    };

    // Create HTTPS server
    const server = https.createServer(sslOptions, app);

    // Start HTTPS server
    server.listen(config.port, () => {
      console.log(`HTTPS Server is running on https://localhost:${config.port}`);
    });

    // Setup WebSocket server with HTTPS
    const wss = new WebSocket.Server({ server });

    // Store connected clients
    // const clients = new Set();

    // // WebSocket connection handler
    // wss.on('connection', (ws) => {
    //   console.log('Client connected');
    //   clients.add(ws);

    //   // Send initial data to the client
    //   waiterService.getGroupedWaiters().then(data => {
    //     ws.send(JSON.stringify({ type: 'initialData', data }));
    //   }).catch(err => {
    //     console.error('Error sending initial data:', err);
    //   });

    //   // Handle client disconnect
    //   ws.on('close', () => {
    //     console.log('Client disconnected');
    //     clients.delete(ws);
    //   });
    // });

    // // Add broadcast function to waiter service
    // waiterService.broadcastUpdate = async () => {
    //   if (clients.size > 0) {
    //     try {
    //       const data = await waiterService.getGroupedWaiters();
    //       const message = JSON.stringify({ type: 'update', data });

    //       clients.forEach(client => {
    //         if (client.readyState === WebSocket.OPEN) {
    //           client.send(message);
    //         }
    //       });
    //     } catch (error) {
    //       console.error('Error broadcasting update:', error);
    //     }
    //   }
    // };

    // Setup MongoDB change stream to detect changes
    // setupChangeStream(tlsDb, waiterService);

  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
};

// Function to set up MongoDB change stream
// const setupChangeStream = async (db, waiterService) => {
//   try {
//     const collection = db.collection('all_waiters');
//     const changeStream = collection.watch();

//     changeStream.on('change', async () => {
//       console.log('Detected change in waiters collection');
//       await waiterService.broadcastUpdate();
//     });

//     console.log('Change stream established for waiters collection');
//   } catch (error) {
//     console.error('Error setting up change stream:', error);
//   }
// };

setupApp();