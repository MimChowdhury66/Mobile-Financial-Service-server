const express = require('express')

const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000


app.use(cors())
// app.use(express.json());
app.use(bodyParser.json());
// job-task
// IpxYCkO8GCsPFfqa



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yq0oebc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db('jobtask').collection('user');




       

        app.post('/users', async (req, res) => {
            const { Email, PIN, MobileNumber, Role, FullName } = req.body;
            // hash pin
            const hashedPin = await bcrypt.hash(PIN, 10);
            const newUser = {
                Email, MobileNumber, Role, FullName,
                PIN: hashedPin,

                status: "pending",
                balance: 0,
            };
            const query = { Email: Email };
            const queryTwo = { MobileNumber: MobileNumber }

            try {
                const existingUserByEmail = await userCollection.findOne(query);
                const existingUserByMobile = await userCollection.findOne(queryTwo);

                if (existingUserByEmail) {
                    return res.status(409).json({ message: 'User Email already exists' });
                }
                if (existingUserByMobile) {
                    return res.status(409).json({ message: 'User Mobile already exists' });
                }



                const result = await userCollection.insertOne(newUser);
                res.status(201).json(result);
            } catch (error) {
                console.error(error);
                res.status(500)({ message: 'Internal server error' });
            }



        });




        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('job-task running')
})

app.listen(port, () => {
    console.log(`job-task ${port}`)
})