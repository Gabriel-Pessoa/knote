const path = require('path')
const express = require('express')
const MongoClient = require('mongodb').MongoClient
const multer = require('multer')
const marked = require('marked')

const app = express()

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/dev' 

const port = process.env.PORT || 3000 // use a porta 3000, a menos que exista uma porta pré-configurada




async function start() {
    const db = await initMongo() // await bloqueia a execução do aplicativo até que o banco de dados esteja pronto

    app.set('view engine', 'pug') //Atribui o nome da configuração ao valor ('valor','nome') ?? onde está pug
    app.set('views', path.join(__dirname, 'views')) //path.join() => resultado => c:\projeto\views
    app.use(express.static(path.join(__dirname, 'public'))) // para entregar arquivos estáticos (imagens, arquivos CSS, e arquivos JavaScript) em um diretório chamado public (c:\projeto\public)

    app.get('/', async (req, res) => {
        res.render('index', { notes: await retrieveNotes(db) }) // recupera dados do banco de dados e carrega
    })
    
    // envio de formulário
    app.post(
      '/note',
     multer({ dest: path.join(__dirname, 'public/uploads/') }).single('image'),
      async (req,res) => { 
        if(!req.body.upload && req.body.description) {
            await saveNote(db, { description: req.body.description })
            res.redirect('/')
        } else if (req.body.upload && req.file) {
            const link = `/uploads/${encodeURIComponent(req.file.filename)}`
            res.render('index', {
                content: `${req.body.description} ![](${link})`,
                notes: await retrieveNotes(db)
            })
        }
      }
    )

    app.listen(port, () => {
        console.log(`App rodando em http://localhost:${port}`)
    })
}


//Essa função continua tentando se conectar a um banco de dados MongoDB no URL especificado até que a conexão seja bem-sucedida.
async function initMongo() { // Retorna um objeto async function
    console.log('Inicializando MongoDB...')
    let sucess = false

    while (!sucess) { // enquanto sucess igual === false, faça:
        try {
            client = await MongoClient.connect(mongoURL, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            })
            sucess = true
        } catch {
            console.log('Erro ao conectar MongoDB, tentando novamente em 1 segundo')
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }
    console.log('MongoDB Inicializado')
    return client.db(client.s.options.dbName).collection('notes') //ele se conecta a um banco de dados e cria uma coleção chamada "notes"
}


async function retrieveNotes(db) {
    const notes = (await db.find().toArray()).reverse() // Atribui a variável notes = um array revertido de um objetos com todas as ocorrências DB
    return notes.map( it => {
        return { ...it, description: marked(it.description)} //converte todas as notas em HTML antes de retornar
    })
}

// função que salva uma única nota no banco de dados:
async function saveNote(db, note) {
    await db.insertOne(note)
    }

start()