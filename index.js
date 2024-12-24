const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
const PORT = 3010;

const uri =
  "mongodb://admin:MongoAdminP%40ss20*@charradiservices.ma:25000/?tls=true&tlsInsecure=true";
const dbName = "tls_database";
let db;

MongoClient.connect(uri)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

app.get("/waiters/count/:city", async (req, res) => {
  const { city } = req.params;

  try {
    const count = await db.collection("all_waiters").countDocuments({ city });
    res.json({ city, count });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching the count" });
  }
});

app.get("/waiters/grouped", async (req, res) => {
  try {
    const groupedWaiters = await db
      .collection("all_waiters")
      .aggregate([
        {
          $group: {
            _id: { city: "$city", cas: "$cas" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.city": 1 },
        },
      ])
      .toArray();

    res.json(groupedWaiters);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while grouping waiters" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
