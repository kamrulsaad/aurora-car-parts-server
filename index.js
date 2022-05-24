import express from "express";
import cors from 'cors'
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
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

    try {

        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result)
        })

        // purchase API 

        app.get('/purchase',verifyJWT, async (req, res) => {
            const query = { email: req.query.email }
            const result = await purchaseCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/purchase/:id', async (req, res) => {
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

        // users API 

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