const Player = require('../models/playerModel')

exports.listPlayers = (req, res) => {
    Player.find({}, (err, players) => {
        if (err) res.send(err)
        res.json(players)
    })
}

exports.createPlayer = (req, res) => {
    const newPlayer = new Player(req.body)

    newPlayer.save((err, player) => {
        if (err) res.send(err)
        res.json(player)
    })
}

exports.readPlayer = (req, res) => {
    Player.findById(req.params.playerId, (err, player) => {
        if (err) res.send(err)
        res.json(player)
    })
}

exports.updatePlayer = (req, res) => {
    Player.findOneAndUpdate(
        { _id: req.params.playerId },
        req.body,
        { new: true },
        (err, player) => {
            if (err) res.send(err)
            res.json(player)
        }
    )
}

exports.deletePlayer = (req, res) => {
    Player.deleteOne(
        { _id: req.params.playerId },
        err => {
            if (err) res.send(err)
            res.json({
                message: 'Player deleted',
                _id: req.params.playerId
            })
        }
    )
}