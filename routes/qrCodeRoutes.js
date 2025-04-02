const express = require("express");
const router = express.Router();
const  getPlantQRCode  = require("../controllers/qrCodeController");

router.get("/get-plant-qr", getPlantQRCode);

module.exports = router;