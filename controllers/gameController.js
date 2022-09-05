const Game = require('../models/gameModel')

exports.listGames = (req, res) => {
    Game.find({}, (err, games) => {
        if (err) res.send(err)
        res.json(games)
    })
}

exports.createGame = (req, res) => {
    const newGame = new Game(req.body)

    newGame.save((err, game) => {
        if (err) res.send(err)
        res.json(game)
    })
}

exports.readGame = (req, res) => {
    Game.findById(req.params.gameId, (err, game) => {
        if (err) res.send(err)
        res.json(game)
    })
}

exports.updateGame = (req, res) => {
    Game.findOneAndUpdate(
        { _id: req.params.gameId },
        req.body,
        { new: true },
        (err, game) => {
            if (err) res.send(err)
            res.json(game)
        }
    )
}

exports.deleteGame = (req, res) => {
    Game.deleteOne(
        { _id: req.params.gameId },
        err => {
            if (err) res.send(err)
            res.json({
                message: 'Game deleted',
                _id: req.params.gameId
            })
        }
    )
}