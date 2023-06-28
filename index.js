const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

//middleware
app.use(express.json())
app.use(cors())

//verify jwt

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized Access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hmvy7hf.mongodb.net/?retryWrites=true&w=majority`;
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
        const appointmentsCollection = client.db('Derma').collection('appointments')
        const bookingsCollection = client.db('Derma').collection('bookings')
        const userCollection = client.db('Derma').collection('users')

        app.get('/appointmentOptions', async(req, res) => {
            const query = {};
            const date = req.query.date

            const options = await appointmentsCollection.find(query).toArray();
            const bookingQuery = { selectedDate: date }
            const bookedAppoinment = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option => {
                const bookedOption = bookedAppoinment.filter(book => book.treatment === option.name);
                const bookedSlots = bookedOption.map(book => book.slot)
                    // console.log(bookedOption ,bookedSlots)
                    //remaining slot
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;

            })
            res.send(options)
        })

        //booking

        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query = {
                email: booking.email,
                selectedDate: booking.selectedDate,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.selectedDate}`;
                return res.send({ acknowledged: false, message })

            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings', verifyJWT, async(req, res) => {

            const email = req.query.email;
            const decodedEmail = req.decoded.email
            const query = { email: email };
            if(email!==decodedEmail){
                return res.status(403).send({message:'forbidden access'})
            }
            const bookings = await bookingsCollection.find(query).toArray();
            // console.log(bookings)
            res.send(bookings);
        });

        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result)
        })
        app.get('/allusers',async(req,res)=>{
            const query={};
            const result= await userCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/jwt', async(req, res) => {

            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '9h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })

    } finally {

    }

}
run().catch(console.log)
app.get('/', async(req, res) => {

    res.send("Derma Home")
})
app.listen(port, () => {
    console.log('SERVER RUNNING')
})