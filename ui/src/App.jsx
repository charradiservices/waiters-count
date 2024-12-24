import { useEffect } from "react";
import "./App.css";
import { useState } from "react";

function App() {
  const [groupedWaiters, setGroupedWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/waiters/grouped") // Replace with your API endpoint
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
    <div className="flex flex-col justify-center items-center mt-16">
      <div className="block w-full overflow-x-auto max-w-xl border">
        <table className="items-center w-full bg-transparent border-collapse">
          <thead>
            <tr>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-base font-semibold text-left uppercase border-l-0 border-r-0 whitespace-nowrap">
                Center
              </th>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-base font-semibold text-left uppercase border-l-0 border-r-0 whitespace-nowrap">
                Category{" "}
              </th>
              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-base font-semibold text-left uppercase border-l-0 border-r-0 whitespace-nowrap min-w-140-px"></th>

              <th className="px-4 bg-gray-50 text-gray-700 align-middle py-3 text-base font-semibold text-left uppercase border-l-0 border-r-0 whitespace-nowrap">
                No of Waiters
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groupedWaiters.map((group, index) => (
              <tr className="text-gray-500" key={index}>
                <th className="border-t-0 px-4 align-middle text-base font-bold whitespace-nowrap p-4 text-left">
                  {group._id.city}
                </th>
                <td className="border-t-0 px-4 align-middle text-base font-medium text-gray-900 whitespace-nowrap p-4">
                  {group._id.cas}
                </td>
                <td className="border-t-0 px-4 align-middle text-base">
                  {group.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-5 rounded"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>
  );
}

export default App;
