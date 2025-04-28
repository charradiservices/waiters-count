import { useEffect } from "react";
import "./App.css";
import { useState } from "react";

function App() {
  const [groupedWaiters, setGroupedWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://charradiservices.ma:5551/waiters/grouped") // Replace with your API endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        setGroupedWaiters(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center text-lg font-semibold mt-10">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-lg font-semibold mt-10 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center mt-16 px-4">
      <div className="block w-full overflow-x-auto max-w-3xl border rounded-lg">
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-sm sm:text-base font-semibold text-left uppercase border-l-0 border-r-0 whitespace-nowrap">
                Center
              </th>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-sm sm:text-base font-semibold text-center uppercase border-l-0 border-r-0 whitespace-nowrap">
                Category
              </th>{" "}
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-sm sm:text-base font-semibold text-center uppercase border-l-0 border-r-0 whitespace-nowrap">
                Booked Count
              </th>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-sm sm:text-base font-semibold text-center uppercase border-l-0 border-r-0 whitespace-nowrap">
                All Waiters Count
              </th>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-sm sm:text-base font-semibold text-center uppercase border-l-0 border-r-0 whitespace-nowrap">
                Ops by Type Count
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groupedWaiters.map((group, index) => (
              <tr className="text-gray-500" key={index}>
                <th className="border-t-0 px-4 align-middle text-sm sm:text-base font-bold whitespace-nowrap p-2 sm:p-4 text-left">
                  {group._id.city}
                </th>
                <td className="border-t-0 px-4 align-middle text-sm sm:text-base font-medium text-gray-900 whitespace-nowrap p-2 sm:p-4 text-center">
                  {group._id.cas}
                </td>{" "}
                <td
                  className={`border-t-0 px-4 align-middle text-sm sm:text-base text-center p-2 sm:p-4 ${
                    group.bookedCount > 0 ? "text-green-600" : "text-rose-600"
                  }`}
                >
                  {group.bookedCount}
                </td>
                <td className="border-t-0 px-4 align-middle text-sm sm:text-base text-center p-2 sm:p-4">
                  {group.count}
                </td>
                <td className="border-t-0 px-4 align-middle text-sm sm:text-base text-center p-2 sm:p-4">
                  <ul className="list-disc list-inside">
                    {group.accTypeCounts.map((accType, accIndex) => (
                      <li key={accIndex}>
                        {accType._id}: {accType.accTypeCount}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-5 rounded w-full sm:w-auto"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>


  );
}

export default App;
