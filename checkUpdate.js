
// script that checks databse every 5 mins

// for each query
    // search item on best buy and amazon
    // check if userPrice >= database price
        // yes -> notify user, delete query
        // no -> do nothing

var sqlite3 = require('sqlite3').verbose();
var nodemailer = require('nodemailer');
var bby = require('bestbuy')(process.env.BB_KEY);
var util = require('util'),
    OperationHelper = require('apac').OperationHelper;
var async = require('async');
var cron = require('node-schedule');

//var rule = new cron.RecurrenceRule();
//rule.second = 30;

var opHelper = new OperationHelper({
    awsId: process.env.AWS_ID,
    awsSecret: process.env.AWS_SECRET,
    assocId: process.env.AWS_ASSOCID
});

var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        XOAuth2: {
            user: "PriceNotificationHere@gmail.com",
            clientId: process.env.MAIL_ID,
            clientSecret: process.env.MAIL_SECRET,
            refreshToken: process.env.MAIL_REFRESH
        }
    }
});

var db = new sqlite3.Database('user_requests.db');

cron.scheduleJob('30 * * * * *', function(){
    console.log("Price Checking...");
    db.serialize(function(){
        db.each('SELECT * FROM users', function(err, row){

            var userEmail = row.email;
            var upc = row.upc;
            var userPrice = row.userPrice;

            var BBproduct;
            var currentBBPrice;
            var BBurl;
            var AZproduct;
            var currentAZPrice;
            var AZurl;

            async.parallel([
                function(callback){
                    bby.products('upc=' + upc, {show: 'salePrice,name,url'})
                        .then(function(data){
                            if(data.products){
                                var product = data.products[0];
                                if(product){
                                    BBproduct = product.name;
                                    currentBBPrice = product.salePrice;
                                    BBurl = product.url;

                                    callback(null);
                                    //console.log("BB: " + currentBBPrice);
                                }
                            }
                        }).catch(function(err){
                        console.warn(err);
                    });
                },

                function(callback){
                    opHelper.execute('ItemLookup', {
                        'SearchIndex': 'All',
                        'IdType': 'UPC',
                        'ItemId': upc,
                        'ResponseGroup': 'Medium'
                    }).then(function(response){
                        var item = response.result.ItemLookupResponse.Items.Item;
                        if(item){
                            if(item.OfferSummary && item.ItemAttributes){
                                if(item.OfferSummary.LowestNewPrice){
                                    currentAZPrice = item.OfferSummary.LowestNewPrice.FormattedPrice;
                                    AZproduct = item.ItemAttributes.Title;
                                    AZurl = item.DetailPageURL;
                                }
                            }
                        }
                        callback(null);
                    }).catch(function(err){
                        console.error("amazon call failed: ", err);
                    });
                }
            ], function(err){

                var mailOptions = {};
                // lets compare the prices of each product
                if(currentBBPrice && currentAZPrice){
                    currentAZPrice = Number(currentAZPrice.replace(/[^0-9\.]+/g,""));
                    currentAZPrice = parseFloat(currentAZPrice);
                    currentBBPrice = parseFloat(currentBBPrice);
                    // console.log(currentBBPrice + ", " + currentAZPrice);

                    if(currentBBPrice <= currentAZPrice){
                        // BB lower price
                        // check if userPrice is lower
                        if(userPrice <= currentBBPrice){
                            // send mail, delete query from database
                            mailOptions.to = userEmail;
                            mailOptions.from = "PriceNotificationHere@gmail.com";
                            mailOptions.subject = "On Sale Now! ~~~ " + BBproduct;
                            mailOptions.text = "Thanks for using Price Check Demo. " +
                                "Your requested product: \"" + BBproduct +
                                "\" is now on sale for " + currentBBPrice + " at Best Buy. " +
                                BBurl;

                            // delete query
                            db.run('DELETE FROM users WHERE id = ' + row.id);
                            
                            smtpTransport.sendMail(mailOptions, function(error, response){
                                if(error){
                                    console.log(error);
                                }else{
                                    console.log(response);
                                }
                                smtpTransport.close();
                            });
                        }
                    }else if(currentAZPrice <= currentBBPrice){
                        // AZ lower price
                        // check if userPrice is lower
                        if(userPrice <= currentAZPrice){
                            // send mail, delete query from database
                            //mailOptions = {};
                            mailOptions.to = userEmail;
                            mailOptions.from = "PriceNotificationHere@gmail.com";
                            mailOptions.subject = "On Sale Now! ~~~ " + AZproduct;
                            mailOptions.text = "Thanks for using Price Check Demo. " +
                                "Your requested product: \"" + AZproduct +
                                "\" is now on sale for " + currentAZPrice + " at Amazon. " +
                                AZurl;
                            
                            // delete query
                            db.run('DELETE FROM users WHERE id = ' + row.id);
                            
                            smtpTransport.sendMail(mailOptions, function(error, response){
                                if(error){
                                    console.log(error);
                                }else{
                                    console.log(response);
                                }
                                smtpTransport.close();
                            });
                        }
                    }
                }else if(currentBBPrice){
                    //var mailOptions = {};
                    // BB lower price
                    // check if userPrice is lower
                    if(userPrice <= currentBBPrice){
                        // send mail, delete query from database
                        mailOptions.to = userEmail;
                        mailOptions.from = "PriceNotificationHere@gmail.com";
                        mailOptions.subject = "On Sale Now! ~~~ " + BBproduct;
                        mailOptions.text = "Thanks for using Price Check Demo. " +
                            "Your requested product: \"" + BBproduct +
                            "\" is now on sale for " + currentBBPrice + " at Best Buy. " +
                            BBurl;

                        // delete query
                        db.run('DELETE FROM users WHERE id = ' + row.id);   
                        
                        smtpTransport.sendMail(mailOptions, function(error, response){
                            if(error){
                                console.log(error);
                            }else{
                                console.log(response);
                            }
                            smtpTransport.close();
                        });
                    }
                }
            });
        });
    });
});




