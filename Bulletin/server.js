	//basic server
	var app = require('express')();
	var express = require('express');
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	var USER_PASSWD = process.argv[2];

	var AccountData = null;

	//set database
	var mongoose = require('mongoose');
	mongoose.connect('mongodb://team7:'+USER_PASSWD+'@localhost/team7' , function(){
	console.log('mongoose connect check !');
	});

	var db = mongoose.connection;

	db.on('error', function (err) {
	  console.log('connection error', err);
	});
	db.once('open', function () {

	  console.log('db once check !');
	  
	  var Schema = mongoose.Schema;
	  var AccountMg = new Schema({
		account : {type : String, unique : true},
		pwd : {type : String, unique : true},
		stat : {type : String}
	  });
	  var UserData = new Schema({
		account: {type: String, unique : true},
		name: {type: String},
		email: {type: String},
		addr: {type: String},
		phone: {type: String},
		biography: {type: String}
	  });
	  var Project = new Schema({
		topic: {type: String},
		author: {type: String},
		type: {type: String},
		price: {type: Number},
		introduction: {type: String},
		content: {type: String},
	  });
	  var Record = new Schema({
		account: {type: String},
		topic: {type: String},
		part: {type: Number},
		price: {type: Number},
		date: {type: String}
	  });
	  var Star = new Schema({
		account : {type : String},
		topic : {type : String},
		star : {type : Number}
	  });
	  var User = mongoose.model('account' , AccountMg);
	  var User_data = mongoose.model('data' , UserData);
	  var User_project = mongoose.model('project' , Project);
	  var Consume_record = mongoose.model('record', Record);
	  var Star = mongoose.model('star',Star);
	  
	  
	  io.on('connection',function(socket){
			
		//accept the account and password from login
		socket.on('sendData',function(data){ 
		  User.findOne({account : data.account},function(err, result){
			
			console.log('findOne account check !'); //check
			
			if(result != null){
			  socket.emit('check','This account had been built.');
			}
			else{
			  User.findOne({pwd : data.pwd},function(err, result){
				  
				console.log('findOne pwd check !');
				  
				if(result != null){
					socket.emit('check', 'This password had been built.')
				}
				else{
					console.log('pwd else check !');
					new User({account : data.account ,
							  pwd : data.pwd , 
							  stat : '0'}).save();
					new User_data({account : data.account,
								   name : data.name , 
								   email : data.email,
								   addr : data.addr,
								   phone : data.phone,
								   biography : data.biography
								   }).save();
					socket.emit('check','You build an account.')
					console.log(data);
				}
			  });
			}
		  });      
		}); 
		
		//Check login
		socket.on('login', function(data){
			
			console.log('socket.on----login')
			
			User.findOne(data , function(err,result){
				if(err){
					socket.emit('log','Error');
				}
				else{
					if(result==null){
						socket.emit('log',false)
					}
					else{
						if(result.stat == '1'){
							socket.emit('log' , true);
						}
						else{
							var AccountStat = null;			
							console.log(result.account);
							User.update({account : result.account} , {$set : {stat : '1'}} , function(){
								console.log(result.account + ' is login');
								AccountStat = '1';
							});
							AccountData = result.account;
							  
							//2015/12/02
							User_data.findOne({account: result.account}, function(err, result_){
								var consume_record = null;
								Consume_record.find({account: result.account}, function(err, result_record){
									consume_record = result_record;
								});
								
								var login_data = {
									data: result_,
									stat: AccountStat,
									record: consume_record
								};
								
								console.log(login_data);
								socket.emit('log',login_data);
							});
						} 
					}  
				}
			});
		});	
		socket.on('load',function(data){ 	
		  if(AccountData == null){
			socket.emit('response' , false);
		  }
		  else{
			socket.emit('response', AccountData);
			AccountData = null;
		  }
		});	

		//log out 
		socket.on('log_out' , function(data){
		  User.update({account : data} , {$set : {stat : '0'}} , function(){
			socket.emit('log_out_res' , true);
		  });
		});	
		
		//get project
		socket.on('sendProject', function(data){
			new User_project({
				topic: data.topic,
				author: data.author,
				type : data.type,
				price: data.price,
				introduction: data.introduction,
				content: data.content
			}).save();
		  socket.emit('save_project_res');
		});
		
		//list topic of project on main
		socket.on('gettitle',function(){
			User_project.find('',function(err,data){
				socket.emit('sendtitle',data);
			});
		});
		
		//check home-page login
		socket.on('req_home', function(data){
			User.findOne({account:data}, function(err, result){
				var current_stat;
				if (result == null){
					current_stat = false;
				}
				else {
					if(result.stat){
						current_stat = true;
					}
					else{
						current_stat = false;
					}
				}

				socket.emit('res_home', current_stat);
			});
			
		});
		
		
		///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//以下是隨機系統
		
		//load topic and introduce from database
		socket.on('read_it_load', function(data){
			User_project.findOne({topic: data.topic}, function(err, res){
				if(res.content != ''){
					Consume_record.find({account: data.account, topic: data.topic}, function(error,result){
					  
					  //將文章分成10個部分
					  var cont = res.content.split('');                                     //字串分割成陣列
					  var cont_part_length = Math.floor(cont.length/10);                    //算出每個部份的長度
					  var cont_part = new Array(10);                                        //10個陣列
					  for(i=1;i<10;i++){                                                    //前9個部分處理
						cont_part[i-1] = '';
						for(j=(i-1)*cont_part_length;j<i*cont_part_length;j++){
						  if(cont[j] == '\n'){
							cont_part[i-1] += '<br>';
						  }
						  else{
							cont_part[i-1] += cont[j];
						  } 
						}
					  }   
					  cont_part[9] = '';                                                    //第10個部分處理
					  for(i=9*cont_part_length;i<cont.length;i++){
						cont_part[9] += cont[i];
					  }
					  
					  var str='';
					  var part = new Array(10);
					  for(i=0;i<10;i++){
						part[i] = 0;
					  }
					  
					  var loadData;
					  
  
						if(result == ''){
							loadData = {                   //還沒買ㄏㄏ
							  topic: res.topic,
							  type: res.type,
							  price: res.price,
							  author: res.author,
							  introduction: res.introduction,
							  content: '',
							  part: 10,
							  free: 0,
							  buyAll: 0,
							  price: res.price
							};
						}
						else if(result.length == 10){
							for(i=0;i<10;i++){
							  str += cont_part[i];
							}
							loadData = {                         //全買了
							  topic: res.topic,
							  type: res.type,
							  price: res.price,
							  author: res.author,
							  introduction: res.introduction,
							  content: str,
							  part: 10-result.length,
							  free: 0,
							  buyAll: 1,
							  price: res.price
							};
						}
						else{
							
							for(i=0;i<result.length;i++){
							  part[result[i].part-1] = 1;
							}
							for(i=1;i<=10;i++){
							  if(part[i-1]==1){
								
								str += cont_part[i-1];
							  }
							  else{
								str += '<br><br>';
							  }
							}
							loadData = {                  //買了一些
							  topic: res.topic,
							  type: res.type,
							  price: res.price,
							  author: res.author,
							  introduction: res.introduction,
							  content: str,
							  part: 10-result.length,
							  free:0,
							  buyAll: 0,
							  price: res.price
							};
						}
						if(result != ''){
							loadData.free = 1;
						}
						  
						socket.emit('read_it_get', loadData);
					});
				}
				else{
					socket.emit('read_it_get', false);
				}
			});
	    });
	
	
	//check the number of parts you can buy
    socket.on('check_part',function(data){
		Consume_record.find({account : data.account, topic: data.topic}, function(err,res){
			if(res != ''){
				if(Math.floor(data.percent/10) > (10 - res.length)){
					socket.emit('check_part_res', res.length);
				}
				else{
					socket.emit('check_part_res', true);
				}
			}
			else{
				socket.emit('check_part_res', true);
			}
		});
	});	
	
	//get profile data
	socket.on('req_profile', function(data){
		//data = localStorage.account (未來也可以是朋友的account，就變成localStorage.friend之類的)
		User_data.findOne({account : data},function(err, result){
			if (err){
				console.log('Getting Profile Error!');
				socket.emit('res_profile', false);
			}
			else{
				console.log('Getting Profile');
				if (result == null){
					console.log('No such account!');
					socket.emit('res_profile', false);
				}
				else{
					console.log('account exist');
					socket.emit('res_profile', result);
				}
			}

		});
    });
	
	
	//buy article
	socket.on('buy', function(data){
	
	  User_project.findOne({topic : data.topic}, function(err, res){
		//將文章分成10個部分
	    var cont = res.content.split('');                                     //字串分割成陣列
		var cont_part_length = Math.floor(cont.length/10);                    //算出每個部份的長度
		var cont_part = new Array(10);                                        //10個陣列
		for(i=1;i<10;i++){                                                    //前9個部分處理
		  cont_part[i-1] = '';
		  for(j=(i-1)*cont_part_length;j<i*cont_part_length;j++){
		    if(cont[j] =='\n'){
			  cont_part[i-1] += '<br>';
			}
			else{
			  cont_part[i-1] += cont[j];
			}  
		  }
		}
		cont_part[9] = '';                                                    //第10個部分處理
		for(i=9*cont_part_length;i<cont.length;i++){
		  cont_part[9] += cont[i];
		}
		
	    Consume_record.find({account: data.account , topic: data.topic}, function(error, result){
		  
		  var str='';
		  
	      var part = new Array(10);
		  for(i=0;i<10;i++){
		    part[i] = 0;
		  }
	      if(result == ''){
		    var rand = Math.floor(Math.random()*9.99);
		    for(i=0;i<Math.floor(data.percent/10);i++){
		      while(part[rand] == 1 ){                          
			    rand = Math.floor(Math.random()*9.99);
			  }
			  part[rand] = 1;
			  new Consume_record({
			      account: data.account,
	              topic: data.topic,
	              part: rand+1,
				  price: res.price/10,
	              date: data.date
			    }).save();
				
			  rand = Math.floor(Math.random()*9.99);
		    }
			for(i=1;i<=10;i++){
			  if(part[i-1]==1){
				
				str += cont_part[i-1];
			  }
			  else{
			    str += '<br><br>';
			  }
			}
		  }
		  else{                                       
		    
		    for(i=0;i<result.length;i++){
			  part[result[i].part-1] = 1; 
			}
			var rand = Math.floor(Math.random()*9.99);
			for(i=0;i<Math.floor(data.percent/10);i++){
		      while(part[rand] == 1 ){                          
			    rand = Math.floor(Math.random()*9.99);
			  }
			  part[rand] = 1;
			  new Consume_record({
			      account: data.account,
	              topic: data.topic,
	              part: rand+1,
				  price: res.price/10,
	              date: data.date
			  }).save();
			  
			  rand = Math.floor(Math.random()*9.99);
		    }
			for(i=1;i<=10;i++){
			  if(part[i-1]==1){
				str += cont_part[i-1];
			  }
			  else{
			    str += '<br><br>';
			  }
			}
		  }
		  Consume_record.find({account: data.account,topic: data.topic},function(er,re){
		    Star.findOne({account:data.account,topic:data.topic},function(erro,resu){
			    var loadData = {
				    content : str,
					part : 0,
					buyAll : 0,
					star : false
				};
			    if(resu != null){
				    loadData.star = true;
				}
				
				if(re.length == 10){
				  loadData.part = 10;
				  loadData.buyAll = 1;  
				}
				else{
				  loadData.part = 10 - re.length;
				  loadData.buyAll = 0;  
				}
				socket.emit('buy_res',loadData);  
			});    
		  });  
	    });
	  });  
	});
		//以上是隨機系統
		////////////////////////////////////////////////////////////////////////////////////////////////////////////
		////////////////////////////////////
		//免費10%
		socket.on('free',function(data){
		  Consume_record.findOne({account:data.account,topic:data.topic},function(error,result){
			if(result == null){
			  User_project.findOne({topic:data.topic},function(err,res){
			  
				//將文章分成10個部分
				var cont = res.content.split('');                                     //字串分割成陣列
				var cont_part_length = Math.floor(cont.length/10);                    //算出每個部份的長度
				var cont_part = new Array(10);                                        //10個陣列
				for(i=1;i<10;i++){                                                    //前9個部分處理
				  cont_part[i-1] = '';
				  for(j=(i-1)*cont_part_length;j<i*cont_part_length;j++){
					if(cont[j] =='\n'){
					  cont_part[i-1] += '<br>';
					}
					else{
					  cont_part[i-1] += cont[j];
					}  
				  }
				}
				cont_part[9] = '';                                                    //第10個部分處理
				for(i=9*cont_part_length;i<cont.length;i++){
				  cont_part[9] += cont[i];
				}
				
				var rand = Math.floor(Math.random()*9.99);
				
				new Consume_record({
					  account: data.account,
					  topic: data.topic,
					  part: rand+1,
					  price: 0,
					  date: data.date
				}).save();
				
				var str = '';
				for(i=0;i<10;i++){
				  if(i != rand)
				  {
					str += '<br>';  
				  }
				  else{
					str += cont_part[rand];
				  }
				 }
				socket.emit('free_res',str);
				
			  });
			}
		  });
		});
		//免費10%
		///////////////////////////////////
		///////////////////////////////////
		//消費紀錄
		socket.on('get_record',function(data){
		  Consume_record.find({account:data},function(err,res){
			if(res != ''){
			  var count = 1;
			  var str1=res[0].topic;
			  var str2=res[0].date;
			  var str3=res[0].price;
			  for(i=0;i<res.length;i++){
				if(i+1 != res.length){
					if(res[i].date != res[i+1].date){
					  count++;
					  str1 += ','+res[i+1].topic;
					  str2 += ','+res[i+1].date;
					  str3 += ','+res[i+1].price;
					}
				}
				
				
			  }
			  console.log(str3);
			  
			  var d = new Array(count);
			  var p = 0;
			  for(i=0;i<count;i++){
				d[i] = 1;
			  }
			  for(i=0;i<res.length;i++){
				if(i+1 != res.length){
					if(res[i].date == res[i+1].date){
					  d[p]++;
					}
					else{
					  p++;
					}
				}
				
			  }
			  
			  var topic = str1.split(',');
			  var date_data = str2.split(',');
			  var price_data = str3.split(',');
			  var record_data = new Array(count);
			  for(i=0;i<count;i++){
				record_data[i] = {
				  topic : topic[i],
				  date : date_data[i],
				  price : price_data[i],
				  count : d[i]
				};
			  }
			  
			  socket.emit('res_record',record_data);
			}
			
			
		  });
		});
		//消費紀錄
		///////////////////////////////////
		///////////////////////////////////
		//文章評分
		socket.on('star',function(data){
			new Star({
				account : data.account,
				topic : data.topic,
				star : data.star
			}).save();
			
			Star.find({topic : data.topic},function(err,res){             //計算平均
				if(res != ''){
					var average = 0;
					var starCount = {
						star1 : 0,
						star2 : 0,
						star3 : 0,
						star4 : 0,
						star5 : 0,
					};
					for(i=0;i<res.length;i++){
					
						average += res[i].star;
						
						if(res[i].star == 1){
							starCount.star1++;
						}
						if(res[i].star == 2){
							starCount.star2++;
						}
						if(res[i].star == 3){
							starCount.star3++;
						}
						if(res[i].star == 4){
							starCount.star4++;
						}
						if(res[i].star == 5){
							starCount.star5++;
						}
					}
					average = average/res.length;
					
					var starData = {
						total : res.length,
						average : average,
						count : starCount,
						you : data.star
					};
					
					socket.emit('res_star',starData);
					
				}
			});
		});
		
		socket.on('read_it_star',function(data){
			Consume_record.find({account:data.account,topic:data.topic}, function(erro, resu){
			
				var payMoney = false;
				
				for(i=0;i<resu.length;i++){
					if(resu[i].price != 0){
						payMoney = true;
						break;
					}
				}
			
				Star.find({topic : data.topic},function(err,res){             //計算平均
					if(res != ''){
						var average = 0;
						var starCount = {
							star1 : 0,
							star2 : 0,
							star3 : 0,
							star4 : 0,
							star5 : 0,
						};
						
						for(i=0;i<res.length;i++){
						
							average += res[i].star;
							
							if(res[i].star == 1){
								starCount.star1++;
							}
							if(res[i].star == 2){
								starCount.star2++;
							}
							if(res[i].star == 3){
								starCount.star3++;
							}
							if(res[i].star == 4){
								starCount.star4++;
							}
							if(res[i].star == 5){
								starCount.star5++;
							}
						}
						average = average/res.length;
						
						Star.findOne({account:data.account,topic:data.topic},function(error,result){
						

							var starData = {
								total : res.length,
								average : average,
								count : starCount,
								payMoney : payMoney,
								noPeople : true,
								you : false
							};
							
							if(result != null){
								starData.you = result.star;
							}
							
							socket.emit('get_it_star',starData);
						});
					}
					else{
						
						var starData = {
						    noPeople : true,
							payMoney: payMoney
						};
						
						socket.emit('get_it_star',starData);
					}
					
					
				});
			});
		});
		//文章評分
		///////////////////////////////////
	  });  
	});
	
	app.use(express.static(__dirname + '/public' ));

	//connect html
	app.get('/', function(req, res){
	  res.sendfile('public/login.html');
	});
	app.get('/user', function(req, res){
	  res.sendfile('public/main2.html');
	});
	app.get('/sign_up', function(req, res){
	  res.sendfile('public/sign_up.html');
	});
	app.get('/login', function(req, res){
	  res.sendfile('public/login.html');
	});
	app.get('/new_project_format', function(req, res){
	  res.sendfile('public/new_project_format_back.html');
	});
	app.get('/read_it', function(req, res){
	  res.sendfile('public/single-post.html');  
	});
	app.get('/index', function(req, res){
	  res.sendfile('public/index.html');  
	});
	app.get('/profile', function(req, res){
	  res.sendfile('public/profile.html');  
	});
	app.get('/single-post', function(req, res){
	  res.sendfile('public/single-post.html');  
	});
	http.listen(8011);

