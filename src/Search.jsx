import { useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

function Search() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestedIds, setRequestedIds] = useState([]);

  async function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);

    const q = query(
      collection(db, "inventory"),
      where("medicineName", "==", searchTerm)
    );

    const snapshot = await getDocs(q);
    const items = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const centerDoc = await getDoc(doc(db, "centers", data.centerId));
      const centerData = centerDoc.exists() ? centerDoc.data() : null;

      items.push({
        id: docSnap.id,
        ...data,
        centerName: centerData ? centerData.name : "Unknown Center",
        isOwnCenter: data.centerId === currentUser.uid
      });
    }

    setResults(items);
  }

  async function handleRequest(item) {
    const quantityStr = prompt(`How many units of ${item.medicineName} do you want to request?`);
    if (!quantityStr) return;

    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    await addDoc(collection(db, "requests"), {
      requestingCenterId: currentUser.uid,
      fulfillingCenterId: item.centerId,
      medicineName: item.medicineName,
      quantityRequested: quantity,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    setRequestedIds([...requestedIds, item.id]);
    alert("Request sent successfully!");
  }

  return (
    <div>
      <h1>Search Medicine</h1>
      <Link to="/dashboard">Back to Dashboard</Link>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search medicine (e.g. Paracetamol)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          required
        />
        <button type="submit">Search</button>
      </form>

      {hasSearched && results.length === 0 && <p>No results found.</p>}

      <table border="1">
        <thead>
          <tr>
            <th>Center</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.id}>
              <td>{item.centerName}{item.isOwnCenter ? " (You)" : ""}</td>
              <td>{item.quantity}</td>
              <td>
                {item.quantity === 0
                  ? "Out of Stock"
                  : item.quantity <= item.lowStockThreshold
                  ? "Low Stock"
                  : "In Stock"}
              </td>
              <td>
                {!item.isOwnCenter && item.quantity > 0 && (
                  requestedIds.includes(item.id) ? (
                    <span>Requested</span>
                  ) : (
                    <button onClick={() => handleRequest(item)}>Request</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Search;