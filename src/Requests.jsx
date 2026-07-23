import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase/config";
import { useAuth } from "./context/AuthContext";
import { Link } from "react-router-dom";

function Requests() {
  const { currentUser } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [centerNames, setCenterNames] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    const incomingQuery = query(
      collection(db, "requests"),
      where("fulfillingCenterId", "==", currentUser.uid)
    );
    const outgoingQuery = query(
      collection(db, "requests"),
      where("requestingCenterId", "==", currentUser.uid)
    );

    const unsubIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIncoming(items);
      fetchCenterNames(items, "requestingCenterId");
    });

    const unsubOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOutgoing(items);
      fetchCenterNames(items, "fulfillingCenterId");
    });

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [currentUser]);

  async function fetchCenterNames(items, fieldName) {
    const newNames = { ...centerNames };
    for (const item of items) {
      const id = item[fieldName];
      if (!newNames[id]) {
        const centerDoc = await getDoc(doc(db, "centers", id));
        newNames[id] = centerDoc.exists() ? centerDoc.data().name : "Unknown";
      }
    }
    setCenterNames(newNames);
  }

  async function handleApprove(request) {
  const deliveryRef = await addDoc(collection(db, "deliveries"), {
    requestId: request.id,
    fromCenterId: request.fulfillingCenterId,
    toCenterId: request.requestingCenterId,
    medicineName: request.medicineName,
    quantity: request.quantityRequested,
    status: "in_transit",
    createdAt: new Date().toISOString()
  });

  await updateDoc(doc(db, "requests", request.id), {
    status: "approved",
    deliveryId: deliveryRef.id
  });

  alert("Request approved and delivery created!");
}

  async function handleReject(requestId) {
    await updateDoc(doc(db, "requests", requestId), { status: "rejected" });
  }

  return (
    <div>
      <h1>Requests</h1>
      <Link to="/dashboard">Back to Dashboard</Link>

      <h2>Incoming Requests (from other centers)</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Requesting Center</th>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  {incoming.map((r) => (
    <tr key={r.id}>
      <td>{centerNames[r.requestingCenterId] || "Loading..."}</td>
      <td>{r.medicineName}</td>
      <td>{r.quantityRequested}</td>
      <td>{r.status}</td>
      <td>
        {r.status === "pending" && (
          <>
            <button onClick={() => handleApprove(r)}>Approve</button>
            <button onClick={() => handleReject(r.id)}>Reject</button>
          </>
        )}
        {r.status === "approved" && (
          <Link to={`/delivery/${r.deliveryId || ""}`}>View Delivery</Link>
        )}
      </td>
    </tr>
  ))}
</tbody>
      </table>

      <h2>Outgoing Requests (sent by you)</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Fulfilling Center</th>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {outgoing.map((r) => (
            <tr key={r.id}>
              <td>{centerNames[r.fulfillingCenterId] || "Loading..."}</td>
              <td>{r.medicineName}</td>
              <td>{r.quantityRequested}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Requests;