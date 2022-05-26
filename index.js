import express from "express";
import cors from 'cors'
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())

// verify token middleware function 

function verifyJWT(req, res, next) {
    const authorization = req.headers.authorization
    if (!authorization) return res.status(401).send({ message: 'Unauthorized Access' })
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Forbidden Access' })
        req.decoded = decoded
        next()
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@aurora-car-parts.jiuln.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    await client.connect()

    const productsCollection = client.db('aurora-car-parts').collection('products')
    const purchaseCollection = client.db('aurora-car-parts').collection('purchase')
    const usersCollection = client.db('aurora-car-parts').collection('users')
    const paymentCollection = client.db('aurora-car-parts').collection('payment')
    const reviewsCollection = client.db('aurora-car-parts').collection('reviews')

    // verify admin middlewear function 

    async function verfyAdmin(req, res, next) {
        const requester = req.decoded.email
        const requestedAccount = await usersCollection.findOne({ email: requester })
        if (requestedAccount.role === 'Admin') {
            next()
        }
        else res.status(403).send({ message: "Forbidden Access" })
    }

    try {

        //products API

        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result.reverse())
        })

        app.post('/products', verifyJWT, verfyAdmin, async(req, res) => {
            const newProduct = req.body
            const result = await productsCollection.insertOne(newProduct)
            res.send(result)
        })

        app.delete('/products', verifyJWT, verfyAdmin, async (req, res) => {
            const query = { _id: ObjectId(req.query.id) }
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })

        // purchase API 

        app.get('/orders', verifyJWT, verfyAdmin, async(req, res) => {
            const result = await  purchaseCollection.find().toArray()
            res.send(result.reverse())
        })

        app.get('/purchase',verifyJWT, async (req, res) => {
            const query = { email: req.query.email }
            const result = await purchaseCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        app.post('/purchase', async (req, res) => {
            const purchase = req.body
            const result = await purchaseCollection.insertOne(purchase)
            res.send({ success: true, data: result })
        })

        app.delete('/purchase', async (req, res) => {
            const query = { _id: ObjectId(req.query.id) }
            const result = await purchaseCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/purchase/:id', verifyJWT, async(req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = {_id : ObjectId(id)}
            const updateDoc = {
                $set: {
                    paid: true,
                    status: 'Pending',
                    transactionId: payment.transactionId
                }
            }
            const result = paymentCollection.insertOne(payment)
            const updatedBooking = await purchaseCollection.updateOne(filter, updateDoc)
            res.send(updatedBooking)
        })

        app.put('/purchase/:id', verifyJWT, verfyAdmin, async(req, res) => {
            const id = req.params.id
            const filter = {_id : ObjectId(id)}
            const options = {upsert: true}
            const updateDoc = {
                $set: {
                    status: 'Approved'
                }
            }
            const result = await purchaseCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // review API

        app.post('/reviews',verifyJWT, async(req, res) => {
            const review = req.body
            const result = await reviewsCollection.insertOne(review)
            res.send(result)
        })

        app.get('/reviews', async(req, res) => {
            const result = await reviewsCollection.find().toArray()
            res.send(result.reverse())
        })

        // users API 

        app.get('/allUsers', async(req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/user', async(req, res) => {
            const email = req.query.email
            const result = await usersCollection.findOne({email})
            res.send(result)
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '3d' })
            res.send({ result, token })
        })

        app.put('/update/:email',verifyJWT, async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.put('/user/admin/:email', verifyJWT, verfyAdmin, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: "Admin" }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email })
            const isAdmin = user?.role === "Admin"
            res.send({ admin: isAdmin })
        })

        // payment API 

        app.get('/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await purchaseCollection.findOne(query)
            res.send(result)
        })

        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const { payableAmount } = req.body;
            const amount = payableAmount* 100
            const paymentIntent = await stripe.paymentIntents.create({
              amount,
              currency: "usd",
              payment_method_types: ['card'],
            });
          
            res.send({
              clientSecret: paymentIntent.client_secret,
            });
          });

    }
    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello form aurora car parts dealer shop')
})

app.listen(port, () => {
    console.log(port);
})