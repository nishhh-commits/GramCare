import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { useNavigate, Link } from "react-router-dom";

function Signup() {
  const [centerName, setCenterName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "centers", user.uid), {
        name: centerName,
        email: email,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        createdAt: new Date().toISOString()
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Register Your Healthcare Center</h1>
      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Center Name"
          value={centerName}
          onChange={(e) => setCenterName(e.target.value)}
          required
        />
        <br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <input
          type="text"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
        <br />
        <input
          type="text"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
        <br />
        {error && <p>{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Signup;