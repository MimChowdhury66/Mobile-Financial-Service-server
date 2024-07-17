const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

//Start MongoDB here
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yq0oebc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //Collections
        const usersCollection = client.db("jobtask").collection("user");

        // Protect routes middleware
        const authenticateToken = (req, res, next) => {
            const token = req.header('Authorization');
            if (!token) return res.status(401).json({ error: 'Access denied' });

            try {
                const verified = jwt.verify(token, process.env.JWT_SECRET);
                req.user = verified;
                next();
            } catch (error) {
                res.status(400).json({ error: 'Invalid token' });
            }
        };
        // Register endpoint
        app.post('/users', async (req, res) => {
            const { name, pin, mobile, email, role } = req.body;

            // Check if the user already exists
            const query = {
                $or: [{ email: email }, { mobile: mobile }],
            };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.status(400).json({ message: "User already exists" });
            }
            const hashedPin = await bcrypt.hash(pin, 10);
            const user = { name, pin: hashedPin, mobile, email, role, status: 'Pending', balance: 0 };
            try {
                const result = await usersCollection.insertOne(user);
                res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
            } catch (error) {
                res.status(500).json({ error: 'Registration failed' });
            }
        });

        // Login endpoint
        app.post('/login', async (req, res) => {
            const { identifier, pin } = req.body;

            try {
                const user = await usersCollection.findOne({
                    $or: [{ email: identifier }, { mobile: identifier }]
                });

                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const isPinValid = await bcrypt.compare(pin, user.pin);
                if (!isPinValid) {
                    return res.status(401).json({ error: 'Invalid PIN' });
                }

                const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.json({ token, user: { name: user.name, email: user.email } });
            } catch (error) {
                res.status(500).json({ error: 'Login failed' });
            }
        });

        // get a user info by email from db
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });





        // Profile endpoint
        app.get('/profile', authenticateToken, async (req, res) => {
            try {
                const userId = req.user.userId;
                const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { pin: 0 } });
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                res.json({ user });
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch user profile' });
            }
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("jobtask Server is Running");
});

app.listen(port, () => {
    console.log(`jobtask server is running on port: ${port}`);
});