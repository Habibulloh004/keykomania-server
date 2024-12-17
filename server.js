import express from "express";
import cors from "cors";
import { StreamClient } from "@stream-io/node-sdk";
import Stripe from "stripe";
import bodyParser from "body-parser";
import dotenv from "dotenv";

const app = express();

dotenv.config();
const port = 5000;

const streamClient = new StreamClient(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);
const stripe = Stripe(process.env.STRIPE_API_KEY);

// Middleware to parse JSON requests
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://spiffy-kleicha-f5c1db.netlify.app",
      "https://spiffy-kleicha-f5c1db.netlify.app",
    ],
  })
);
app.use(bodyParser.json());
// Home route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/api", (req, res) => {
  const expirationTime = Math.floor(Date.now() / 1000) + 3600;
  const issuedAt = Math.floor(Date.now() / 1000) - 60;

  const token = streamClient.createToken("fikserr", expirationTime, issuedAt);
  res.json(token);
});

app.post("/user", (req, res) => {
  try {
    const nameUser = req.body?.name;
    if (!nameUser) {
      return res.status(400).json({ error: "Name is required" });
    }

    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const issuedAt = Math.floor(Date.now() / 1000) - 60;

    const token = streamClient.createToken(nameUser, expirationTime, issuedAt);
    res.json({ token });
    console.log("run");
  } catch (error) {
    console.error("Error creating token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const items = req.body; // Assuming req.body is an array of items

  try {
    // Map each item from the request body to a line item in the Stripe session
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: item.price * 100, // Stripe expects the amount in cents
      },
      quantity: item.quantity, // Quantity for each product
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems, // Use the dynamically created line items
      mode: "payment",
      success_url: "http://localhost:5173",
      cancel_url: "http://localhost:5173/cancel",
      customer_creation: "always",
      phone_number_collection: {
        enabled: true,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
