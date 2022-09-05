const gameController = require('../controllers/gameController')
const express = require('express')
const router = express.Router()

router.get('/', gameController.listGames)

router.post('/', gameController.createGame)

router.get('/:gameId', gameController.readGame)

router.put('/:gameId', gameController.updateGame)

router.delete('/:gameId', gameController.deleteGame)

module.exports = router