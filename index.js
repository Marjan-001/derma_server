const express = require('express');
const cors = require('cors');
const app= express();
require('dotenv').config()
const port = process.env.PORT||5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

//middleware
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hmvy7hf.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run(){
try{
const appointmentsCollection= client.db('Derma').collection('appointments')
const bookingsCollection= client.db('Derma').collection('bookings')

app.get('/appointmentOptions' , async(req,res)=> {
const query={};
const date=req.query.date

const options = await appointmentsCollection.find(query).toArray();
const bookingQuery={selectedDate:date}
const bookedAppoinment= await bookingsCollection.find(bookingQuery).toArray();
options.forEach(option=>{
const bookedOption=bookedAppoinment.filter(book=>book.treatment===option.name);
const bookedSlots=bookedOption.map(book=>book.slot)
// console.log(bookedOption ,bookedSlots)
//remaining slot
const remainingSlots = option.slots.filter(slot=>!bookedSlots.includes(slot));
option.slots=remainingSlots;

})
res.send(options)
})

//booking

app.post('/bookings',async(req,res)=>{
  const booking = req.body;

  const result= await bookingsCollection.insertOne(booking);
  res.send(result);
})

}
finally{

}

}
run().catch(console.log)
app.get('/', async(req,res)=>{

    res.send("Derma Home")
})
app.listen(port,()=>{
    console.log('SERVER RUNNING')
})