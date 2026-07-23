import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { calculateDistance, daysUntilExpiry, calculateRedistributionScore } from "./utils/distance";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

import { signOut } from "firebase/auth";
import { db, auth } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { useNavigate, Link} from "react-router-dom";



function Dashboard() {
  const [suggestions, setSuggestions] = useState({});

async function fetchSuggestions(medicineName, myCenterId) {
  const myCenterDoc = await getDoc(doc(db, "centers", myCenterId));
  const myCenter = myCenterDoc.data();

  const invQuery = query(
    collection(db, "inventory"),
    where("medicineName", "==", medicineName)
  );
  const invSnapshot = await getDocs(invQuery);

  const candidates = [];

  for (const invDoc of invSnapshot.docs) {
    const data = invDoc.data();
    if (data.centerId === myCenterId) continue;
    if (data.quantity <= data.lowStockThreshold) continue;

    const centerDoc = await getDoc(doc(db, "centers", data.centerId));
    if (!centerDoc.exists()) continue;
    const centerData = centerDoc.data();

    const distance = calculateDistance(
      myCenter.latitude,
      myCenter.longitude,
      centerData.latitude,
      centerData.longitude
    );
    const daysLeft = daysUntilExpiry(data.expiryDate);
    const score = calculateRedistributionScore(distance, daysLeft);

    candidates.push({
      centerId: data.centerId,
      centerName: centerData.name,
      quantity: data.quantity,
      distance: distance.toFixed(1),
      daysLeft,
      score
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  setSuggestions((prev) => ({ ...prev, [medicineName]: candidates.slice(0, 3) }));
}
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("");
  const [expiry, setExpiry] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "inventory"),
      where("centerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedicines(items);
    });

    return unsubscribe;
  }, [currentUser]);

  async function handleAddOrUpdate(e) {
    e.preventDefault();

    const medicineData = {
      centerId: currentUser.uid,
      medicineName: name,
      quantity: parseInt(quantity),
      lowStockThreshold: parseInt(threshold),
      expiryDate: expiry,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), medicineData);
      setEditingId(null);
    } else {
      await addDoc(collection(db, "inventory"), medicineData);
    }

    setName("");
    setQuantity("");
    setThreshold("");
    setExpiry("");
  }

  function handleEdit(medicine) {
    setEditingId(medicine.id);
    setName(medicine.medicineName);
    setQuantity(medicine.quantity);
    setThreshold(medicine.lowStockThreshold);
    setExpiry(medicine.expiryDate);
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, "inventory", id));
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  const lowStockCount = medicines.filter(
    (m) => m.quantity <= m.lowStockThreshold
  ).length;

  return (
    <div>
      <h1>Gram Care Dashboard</h1>
      <Link to="/search">Go to Global Search</Link>
      <Link to="/requests">Go to Requests</Link>
      <button onClick={handleLogout}>Logout</button>

      <h2>Stats</h2>
      <h2>Stock Levels</h2>
{medicines.length > 0 && (
  <div style={{ maxWidth: "600px" }}>
    <Bar
      data={{
        labels: medicines.map((m) => m.medicineName),
        datasets: [
          {
            label: "Quantity",
            data: medicines.map((m) => m.quantity),
            backgroundColor: medicines.map((m) =>
              m.quantity <= m.lowStockThreshold ? "red" : "green"
            )
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }}
    />
  </div>
)}
      <p>Total medicines: {medicines.length}</p>
      <p>Low stock items: {lowStockCount}</p>

      <h2>{editingId ? "Edit Medicine" : "Add Medicine"}</h2>
      <form onSubmit={handleAddOrUpdate}>
        <input
          type="text"
          placeholder="Medicine Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <br />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <br />
        <input
          type="number"
          placeholder="Low Stock Threshold"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          required
        />
        <br />
        <input
          type="date"
          placeholder="Expiry Date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          required
        />
        <br />
        <button type="submit">{editingId ? "Update" : "Add"}</button>
      </form>

      <h2>Inventory</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Threshold</th>
            <th>Expiry</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((m) => (
            <tr key={m.id}>
              <td>{m.medicineName}</td>
              <td>{m.quantity}</td>
              <td>{m.lowStockThreshold}</td>
              <td>{m.expiryDate}</td>
              <td>
  {m.quantity <= m.lowStockThreshold ? "Low Stock" : "In Stock"}

  {m.quantity <= m.lowStockThreshold && (
    <button
      onClick={() => fetchSuggestions(m.medicineName, currentUser.uid)}
    >
      Show Suggestions
    </button>
  )}
</td>
              <td>
                <button onClick={() => handleEdit(m)}>Edit</button>
                <button onClick={() => handleDelete(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.keys(suggestions).map((medName) => (
  <div key={medName}>
    <h3>Suggestions for {medName}</h3>
    {suggestions[medName].length === 0 ? (
      <p>No surplus found at other centers.</p>
    ) : (
      <table border="1">
        <thead>
          <tr>
            <th>Center</th>
            <th>Distance (km)</th>
            <th>Quantity Available</th>
            <th>Expiry (days left)</th>
          </tr>
        </thead>
        <tbody>
          {suggestions[medName].map((s, idx) => (
            <tr key={idx}>
              <td>{s.centerName}</td>
              <td>{s.distance}</td>
              <td>{s.quantity}</td>
              <td>{s.daysLeft}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
))}
    </div>
  );
}


export default Dashboard;
