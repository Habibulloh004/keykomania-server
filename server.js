import express from "express";
import cors from "cors";
import { StreamClient } from "@stream-io/node-sdk";
import Stripe from "stripe";
import bodyParser from "body-parser";

const app = express();

const port = 5000;
const STREAM_API_KEY = "7hb9h3q2d79h";
const STREAM_API_SECRET =
  "9hvcrd25zccf38t2fmjy9hwn5tr8zngwzd6x5mrsu2jmqe4ruq3qg4ss39e3f5xm";
const STRIPE_API_KEY =
  "sk_test_51QOJUPEmgytizOGisI9yy4xOVpU5D0aF34qiybMnR3Ku4dPhz37qy9KEM6Cb0YJYAPYz7hVO8nqwK6eb4JHa4o8O00aM5eMOGy";
const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);
const stripe = Stripe(STRIPE_API_KEY);

// Middleware to parse JSON requests
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
  })
);
app.use(bodyParser.json());
// Home route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Example API route
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
