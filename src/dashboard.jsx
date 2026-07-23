import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
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
              </td>
              <td>
                <button onClick={() => handleEdit(m)}>Edit</button>
                <button onClick={() => handleDelete(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;
