require('dotenv').config()
const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const Quiz = require('./models/quizModel')
const Player = require('./models/playerModel')
const Game = require('./models/gameModel')
const quizRouter = require('./routes/quizRoutes')
const gameRouter = require('./routes/gameRoutes')
const playerRouter = require('./routes/playerRoutes')

mongoose.Promise = global.Promise

const app = express()
const mongoURI = process.env.MONGO_URI
const port = process.env.PORT || 3001

mongoose.connect(mongoURI, { useNewUrlParser: true },
    () => console.log('MongoDB connection established:', mongoURI)
)
const db = mongoose.connection
db.on('error', err => console.log(err.message + ' is Mongod not running?'))
db.on('disconnected', () => console.log('mongo disconnected'))

const server = http.createServer(app)
const io = new Server(server, 
    {
    cors: {
        origin: "https://aura-quiz-server.herokuapp.com"
    }
}
)

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static('public'))
app.use(cors())

app.use('/quizzes', quizRouter)
app.use('/games', gameRouter)
app.use('/players', playerRouter)


io.on('connection', (socket) => {

    console.log(`User Connected: ${socket.id}`)

    socket.on('host_joined', quizId => {
        Quiz.findById(quizId, (err, quiz) => {
            if (err) console.log(err)

            let newGame

            if (quiz) {
                let pin = Math.floor(Math.random() * 90000000) + 10000000

                newGame = new Game({
                    hostId: socket.id,
                    pin: pin,
                    quiz: quiz,
                    gameStatus: false,
                    playersAnswered: 0,
                    questionNumber: 1,
                    questionStatus: false
                })

                newGame.save((err, game) => {
                    if (err) console.log(err)
                })

                socket.join(pin)
                
                socket.emit('show_pin', {
                    pin: newGame.pin
                })
            }
        })
    })

    socket.on('player_joined', data => {
        let pin = data.pin
        let nickname = data.nickname
        
        let gameFound = false
        let nicknameTaken = false

        Game.findOne({ pin: pin }, (err, game) => {
            if (err) console.log(err)

            if (game) {
                const gameId = game._id
                const hostId = game.hostId

                Player.findOne({ game: gameId, nickname: nickname }, (err, player) => {
                    if (err) console.log(err)

                    if (player) {
                        socket.emit('nickname_taken')
                        nicknameTaken = true
                        return
                    } else {
                        newPlayer = new Player({
                            game: game,
                            hostId: hostId,
                            pin: pin,
                            playerId: socket.id,
                            nickname: nickname,
                            answer: null,
                            score: 0,
                            streak: 0,
                            rank: 0,
                            lastCorrect: false,
                            totalCorrect: 0
                        })

                        newPlayer.save((err, player) => {
                            if (err) console.log(err)

                            socket.join(pin)

                            socket.emit('player_joined_success', {
                                nickname: player.nickname,
                                pin: pin
                            })

                            Player.find({ game: gameId }, (err, players) => {
                                if (err) console.log(err)

                                const playersData = {
                                    players: players,
                                    playersCount: players.length
                                }

                                io.to(pin).emit('update_lobby', playersData)
                            })
                        })
                    }
                })

                gameFound = true
            }

            if (!gameFound) {
                socket.emit('game_not_found')
            }
        })
    })

    socket.on('host_started_game', data => {
        const pin = parseInt(data)
        const filter = { hostId: socket.id, pin: pin }
        const update = { gameStatus: true, questionStatus: true }

        Game.findOneAndUpdate(filter, update, { new: true }).exec((err, game) => {
            if (err) console.log(err)
            
            io.to(pin).emit('game_started')
        })
    })

    socket.on('fetch_intro', pin => {
        Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec((err, game) => {
            if (err) console.log(err)

            const quizName = game.quiz.title
            const totalNumQuestions = game.quiz.questions.length

            socket.emit('game_intro', { quizName: quizName, totalNumQuestions: totalNumQuestions })
        })
    })

    socket.on('fetch_num_questions', pin => {
        Game.findOne({ pin: pin }).populate('quiz').exec((err, game) => {
            if (err) console.log(err)

            const gameId = game._id
            const totalNumQuestions = game.quiz.questions.length

            socket.emit('receive_num_questions', { gameId: gameId, totalNumQuestions: totalNumQuestions })
        })
    })

    socket.on('fetch_first_question', pin => {
        Promise.all([
            Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec(),
            Player.countDocuments({ hostId: socket.id, pin: pin }).exec()
        ]).then(([game, count]) => {
            
            const numPlayers = count

            const hostData = {
                gameId: game._id,
                quizName: game.quiz.name,
                totalNumQuestions: game.quiz.questions.length,
                question: game.quiz.questions[game.questionNumber - 1],
            }

            const playerData = {
                questionNumber: game.questionNumber,
                answers: game.quiz.questions[game.questionNumber - 1].answers
            }

            socket.emit('receive_first_question', hostData)

            io.to(game.pin).emit('receive_answer_options', playerData)
        })
    })

    socket.on('answer_submitted', data => {
        const { answer, gameId } = data

        const filter = { playerId: socket.id, game: gameId }

        Promise.all([
            Player.findOne(filter).exec(),
            Player.countDocuments({ game: gameId }).exec(),
            Game.findById({ _id: gameId }).populate('quiz').exec()
        ]).then(([player, count, game]) => {

            let numPlayers = count

            const correctAnswer = game.quiz.questions[game.questionNumber - 1].correct

            if (game.questionStatus) {
                
                let score
                let lastCorrect
                let streak
                let totalCorrect

                if (data.answer === correctAnswer) {
                    score = player.score + 200
                    io.to(game.pin).emit('fetch_time', socket.id)
                    lastCorrect = true
                    streak = player.streak + 1
                    totalCorrect = player.totalCorrect + 1
                } else {
                    score = player.score
                    lastCorrect = false
                    streak = 0
                    totalCorrect = player.totalCorrect
                }

                const update = {
                    answer: answer,
                    score: score,
                    lastCorrect: lastCorrect,
                    streak: streak,
                    totalCorrect: totalCorrect
                }

                const playersAnswered = game.playersAnswered + 1

                Promise.all([
                    Player.findOneAndUpdate(filter, update, { new: true }).exec(),
                    Game.findByIdAndUpdate({ _id: game._id }, { playersAnswered: playersAnswered }, { new: true }).exec()
                ]).then(([p, g]) => {
                    
                    io.to(g.pin).emit('update_players_answered', playersAnswered)

                    if (g.playersAnswered === numPlayers) {
                        Promise.all([
                            Game.findByIdAndUpdate({ _id: game._id }, { questionStatus: false }, { new: true }).exec(),
                            Player.find({ game: gameId })
                        ]).then(([game, players]) => {
                            
                            let answeredA = 0
                            let answeredB = 0
                            let answeredC = 0
                            let answeredD = 0

                            for (let i = 0; i < players.length; i++) {
                                if (players[i].answer === 'a') {
                                    answeredA += 1
                                } else if (players[i].answer === 'b') {
                                    answeredB += 1
                                } else if (players[i].answer === 'c') {
                                    answeredC += 1
                                } else if (players[i].answer === 'd') {
                                    answeredD += 1
                                }
                            }

                            const data = {
                                answeredA: answeredA,
                                answeredB: answeredB,
                                answeredC: answeredC,
                                answeredD: answeredD,
                                correctAnswer: correctAnswer
                            }

                            io.to(game.pin).emit('question_result', data)
                        })
                    }
                })
            }
        })
    })

    socket.on('send_time', data => {
        const { pin, playerId, time } = data

        const filter = { playerId: playerId, pin: pin }

        let score

        Player.findOne(filter, (err, player) => {
            if (err) console.log(err)

            score = player.score + time * 115

            const update = { score: score }

            Player.findOneAndUpdate(filter, update, { new: true }, (err, p) => {
                if (err) console.log(err)
            })
        })
    })

    socket.on('question_end', pin => {

        const filter = { hostId: socket.id, pin: pin }
        const update = { questionStatus: false }
        const filterPlayers = { hostId: socket.id, pin: pin, answer: null }
        const updatePlayers = { lastCorrect: false, streak: 0 }

        Promise.all([
            Player.updateMany(filterPlayers, updatePlayers).exec(),
            Game.findOneAndUpdate(filter, update, { new: true }).populate('quiz').exec()
        ]).then(([count, game]) => {

            let correctAnswer = game.quiz.questions[game.questionNumber - 1].correct

            Player.find(filter, (err, players) => {
                if (err) console.log(err)

                let answeredA = 0
                let answeredB = 0
                let answeredC = 0
                let answeredD = 0

                for (let i = 0; i < players.length; i++) {
                    if (players[i].answer === 'a') {
                        answeredA += 1
                    } else if (players[i].answer === 'b') {
                        answeredB += 1
                    } else if (players[i].answer === 'c') {
                        answeredC += 1
                    } else if (players[i].answer === 'd') {
                        answeredD += 1
                    }
                }

                const info = {
                    answeredA: answeredA,
                    answeredB: answeredB,
                    answeredC: answeredC,
                    answeredD: answeredD,
                    correctAnswer: correctAnswer
                }

                io.to(game.pin).emit('question_result', info)
            })
        })
    })

    socket.on('fetch_score', info => {
        
        const { nickname, gameId } = info

        const filter = { playerId: socket.id, game: gameId }

        Promise.all([
            Player.findOne(filter).exec(),
            Player.find({ game: gameId }).exec()
        ]).then(([player, players]) => {
            
            const playerScore = player.score
            
            let scores = []

            for (let i = 0; i < players.length; i++) {
                scores.push(players[i].score)
            }

            const sortedScores = scores.sort((a, b) => b - a)
            const rank = sortedScores.indexOf(playerScore) + 1

            const update = { rank: rank }
            Player.findOneAndUpdate(filter, update, { new: true }).exec((err, p) => {
                if (err) console.log(err)

                const data = {
                    score: p.score,
                    rank: p.rank,
                    streak: p.streak,
                    lastCorrect: p.lastCorrect
                }

                socket.emit('player_results', data)
            })
        })
    })

    socket.on('fetch_scoreboard', gameId => {

        Player.find({ game: gameId }, (err, players) => {
            if (err) console.log(err)

            let playerScores = []
            for (let i = 0; i < players.length; i++) {
                const temp = {
                    nickname: players[i].nickname,
                    score: players[i].score
                }

                playerScores.push(temp)
            }

            const sortedPlayerScores = playerScores.filter(({ score }) => score !== null).sort((x,y) => y.score - x.score).map((x, i) => Object.assign({ rank: i + 1 }, x))

            let rankedPlayers

            if (sortedPlayerScores.length <= 5) {
                rankedPlayers = sortedPlayerScores
            } else {
                rankedPlayers = sortedPlayerScores.slice(0, 5)
            }

            socket.emit('receive_scoreboard', rankedPlayers)
        })
    })

    socket.on('fetch_next_question', data => {
        
        const { pin, questionNumber } = data
        const filter = { hostId: socket.id, pin: pin }
        const updatePlayer = { answer: null, lastCorrect: false }
        const updateGame = { questionNumber: questionNumber, questionStatus: true, playersAnswered: 0 }

        Promise.all([
            Player.updateMany(filter, updatePlayer).exec(),
            Game.findOneAndUpdate(filter, updateGame, { new: true }).populate('quiz').exec(),
            Player.countDocuments(filter).exec()
        ]).then(([players, game, count]) => {
            
            let numPlayers = count

            let nextQuestionHost
            let nextQuestionPlayer

            const numQuestions = game.quiz.questions.length

            if (questionNumber <= numQuestions)  {

                const nextQuestionHost = {
                    questionNumber: game.questionNumber,
                    question: game.quiz.questions[questionNumber - 1],
                    numPlayers: numPlayers
                }

                const nextQuestionPlayer = {
                    questionNumber: game.questionNumber,
                    totalNumQuestions: numQuestions,
                    answers: game.quiz.questions[game.questionNumber - 1].answers
                }

                socket.emit('next_question', nextQuestionHost)

                io.to(game.pin).emit('receive_next_answer_options', nextQuestionPlayer)
            }
        })
    })

    socket.on('proceed_to_next_question', pin => {
        io.to(pin).emit('go_to_next_question')
    })

    socket.on('player_rank', gameId => {
        
        Player.findOne({ playerId: socket.id, game: gameId }, (err, player) => {
            if (err) console.log(err)

            const data = {
                score: player.score,
                totalCorrect: player.totalCorrect,
                rank: player.rank
            }

            socket.emit('final_rank', data)
        })
    })

    socket.on('finish_game', pin => {

        io.to(pin).emit('final_view')

        const filter = { hostId: socket.id, pin: pin }

        Promise.all([
            Game.findOneAndUpdate(filter, { gameStatus: false }, { new: true }).populate('quiz').exec(),
            Player.find(filter).exec()
        ]).then(([game, players]) => {

            let playerScores = []

            for (let i = 0; i < players.length; i++) {
                const temp = {
                    nickname: players[i].nickname,
                    score: players[i].score,
                    totalCorrect: players[i].totalCorrect
                }
                playerScores.push(temp)
            }

            const sortedPlayerScores = playerScores.filter(({ score }) => score !== null).sort((x, y) => y.score - x.score).map((x, i) => Object.assign({ rank: i + 1 }, x))
            
            let finalRankings

            if (sortedPlayerScores.length <= 3) {
                finalRankings = sortedPlayerScores
            } else {
                finalRankings = sortedPlayerScores.slice(0, 3)
            }

            io.to(game.pin).emit('game_over', finalRankings)
        })
    })

    socket.on('disconnect', () => {
        
        Game.findOne({ hostId: socket.id }, (err, game) => {
            if (err) console.log(err)

            if (game) {
                Promise.all([
                    Game.findByIdAndDelete({ _id: game._id }).exec(),
                    Player.deleteMany({ hostId: game.hostId }).exec()
                ]).then(([g, players]) => {

                    io.to(game.pin).emit('host_disconnected')
                })

                socket.leave(game.pin)
            } else {
                Player.findOne({ playerId: socket.id }, (err, player) => {
                    if (err) console.log(err)

                    if (player) {
                        
                        const pin = player.pin
                        const gameId = player.game

                        Promise.all([
                            Player.deleteOne({ playerId: socket.id }).exec(),
                            Game.findById({ _id: gameId }).exec()
                        ]).then(([p, gameA]) => {

                            if (!gameA.gameStatus) {

                                Player.find({ game: gameId }, (err, players) => {
                                    if (err) console.log(err)

                                    const playersData = {
                                        players: players,
                                        playersCount: players.length
                                    }

                                    io.to(pin).emit('update_lobby', playersData)

                                    socket.leave(pin)
                                })
                            } else {
                                socket.leave(pin)
                            }
                        })
                    }
                })
            }
        })
    })

})

server.listen(port, () => {
    console.log(`*** Listening on http://localhost:${port} ***`)
})
