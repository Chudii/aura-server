require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { addPlayer, removePlayer, getPlayer, getPlayersInRoom } = require('./utilities/players')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const port = process.env.PORT || 3001

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'))
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

io.on('connection', (socket) => {

    console.log(`User Connected: ${socket.id}`)

    

    socket.on('join', (payload, callback) => {
        const { error, newPlayer } = addPlayer({
            id: socket.id,
            name: payload.name,
            room: payload.room
        })

        if (error)
            return callback(error)

        socket.emit('message', { name: newPlayer.name, text: `${newPlayer.name}, welcome to room ${newPlayer.room}` })

        socket.join(newPlayer.room)

        io.to(newPlayer.room).emit('roomData', { room: newPlayer.room, players: getPlayersInRoom(newPlayer.room) })
        // socket.emit('currentPlayerData', { name: newPlayer.name })
        callback()
    })

    // socket.on('initGameState', gameState => {
    //     const player = getPlayer(socket.id)
    //     if (player)
    //         io.to(player.room).emit('initGameState', gameState)
    // })

    // socket.on('updateGameState', gameState => {
    //     const player = getPlayer(socket.id)
    //     if (player)
    //         io.to(player.room).emit('updateGameState', gameState)
    // })

    socket.on('disconnect', () => {
        const player = removePlayer(socket.id)
        if (player)
            io.to(player.room).emit('roomData', { room: player.room, players: getPlayersInRoom(player.room) })
    })

})

server.listen(port, () => {
    console.log(`*** Listening on http://localhost:${port} ***`)
}) 