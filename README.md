# CheckDatabase

An addition script that runs alongside: https://github.com/BagOfChips/PriceCheckDemo

Check out the deployed Heroku app here: https://compare-amazon-bestbuy.herokuapp.com/

## Overview

This will be ran as a child process from `app.js` in PriceCheckDemo.
Goes through each query and searches Amazon and Best Buy databases to see if any customers' selected item has dropped below their requested price - notify if so.


