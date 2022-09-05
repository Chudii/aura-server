const playerController = require('../controllers/playerController')
const express = require('express')
const router = express.Router()

router.get('/', playerController.listPlayers)

router.post('/', playerController.createPlayer)

router.get('/:playerId', playerController.readPlayer)

router.put('/:playerId', playerController.updatePlayer)

router.delete('/:playerId', playerController.deletePlayer)

module.exports = router