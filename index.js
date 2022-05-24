import express from "express";
import cors from 'cors'
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@aurora-car-parts.jiuln.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){

    await client.connect()

    const productsCollection = client.db('aurora-car-parts').collection('products')

    try{

        app.get('/products', async(req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result)
        })

        app.get('/purchase/:id', async(req, res) => {
            const id = req.params.id
            const query = {_id: ObjectId(id)}
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

    }
    finally{

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello form aurora car parts dealer shop')
})

app.listen(port, () => {
    console.log(port);
})