(function(){

	$(document).ready(function () {

		$(document).one("baseReady", function () {

			Spank.base.myFriends = new Firebase(Spank.base.url + "/friends/");

//			var moreFriends = '[{"uid":"42353244243","username": "", "name": "Wilford Strouse"}, {"username": "constance_lujan", "name": "Constance Lujan"}, {"username": "ranae_nisbet", "name": "Ranae Nisbet"}, {"username": "stacey_desjardins", "name": "Stacey Desjardins"}, {"username": "renda_blind", "name": "Renda Blind"}, {"username": "karen_ashton", "name": "Karen Ashton"}, {"username": "ramiro_geers", "name": "Ramiro Geers"}, {"username": "eden_magnusson", "name": "Eden Magnusson"}, {"username": "charlotte_kari", "name": "Charlotte Kari"}, {"username": "conrad_madruga", "name": "Conrad Madruga"}, {"username": "cheyenne_woolridge", "name": "Cheyenne Woolridge"}, {"username": "mohamed_voorhees", "name": "Mohamed Voorhees"}, {"username": "simone_mcnabb", "name": "Simone Mcnabb"}, {"username": "jamey_daubert", "name": "Jamey Daubert"}, {"username": "cherrie_meisel", "name": "Cherrie Meisel"}, {"username": "rosana_ferreira", "name": "Rosana Ferreira"}, {"username": "brock_divine", "name": "Brock Divine"}, {"username": "deanne_stpierre", "name": "Deanne Stpierre"}, {"username": "deena_zielke", "name": "Deena Zielke"}, {"username": "elayne_dinsmore", "name": "Elayne Dinsmore"}, {"username": "tyler_lieb", "name": "Tyler Lieb"}, {"username": "exie_crays", "name": "Exie Crays"}, {"username": "willodean_claassen", "name": "Willodean Claassen"}, {"username": "liz_bunyard", "name": "Liz Bunyard"}, {"username": "erick_yeung", "name": "Erick Yeung"}, {"username": "homer_rayl", "name": "Homer Rayl"}, {"username": "mariano_lamoreaux", "name": "Mariano Lamoreaux"}, {"username": "verena_tovar", "name": "Verena Tovar"}, {"username": "azalee_reneau", "name": "Azalee Reneau"}, {"username": "maurice_falbo", "name": "Maurice Falbo"}, {"username": "ellsworth_warrick", "name": "Ellsworth Warrick"}, {"username": "laine_mckendree", "name": "Laine Mckendree"}, {"username": "masako_wisneski", "name": "Masako Wisneski"}, {"username": "bennie_magill", "name": "Bennie Magill"}, {"username": "felisha_westbrooks", "name": "Felisha Westbrooks"}, {"username": "randolph_guertin", "name": "Randolph Guertin"}, {"username": "susann_thorn", "name": "Susann Thorn"}, {"username": "minerva_futral", "name": "Minerva Futral"}, {"username": "nanci_moscato", "name": "Nanci Moscato"}, {"username": "luanne_raabe", "name": "Luanne Raabe"}, {"username": "janiece_mencer", "name": "Janiece Mencer"}, {"username": "julie_campo", "name": "Julie Campo"}, {"username": "manuela_jepsen", "name": "Manuela Jepsen"}, {"username": "alysia_arbaugh", "name": "Alysia Arbaugh"}, {"username": "trinidad_clayson", "name": "Trinidad Clayson"}, {"username": "nereida_ladouceur", "name": "Nereida Ladouceur"}, {"username": "collin_tortora", "name": "Collin Tortora"}, {"username": "treena_melchor", "name": "Treena Melchor"}, {"username": "belia_orellana", "name": "Belia Orellana"}]';
//			var friends = '[{"username": "restbeckett", "name": "Adrian Loh"},{"name":"Sun Kok Weng","username":"sun.k.weng","uid":754794750},{"name":"Elaine Loh","username":"elainelmy","uid":903000264},{"name":"W.k. Lee","username":"","uid":1062800197}]';
//			$.each(JSON.parse(friends), function(i,o) {
//				FBUserInfo.friends.push(o);
//			});

			Spank.friends = {
				visible: ko.observable(false),
				bases:{},
				friendlist: ko.observableArray([]),
				addNewFriend: function(friendData) {
					var self = this,
						koo = {};
					$.each(friendData, function(k,v) {
						koo[k] = ko.observable(v);
					});
					self.friendlist.push(koo);
					self.bases[friendData.username] = {
						observable: koo,
						base: new Firebase(Spank.base.myFriends + "/" + friendData.username),
						history: new Firebase(Spank.base.users + friendData.username + "/history"),
						live: new Firebase(Spank.base.users + friendData.username + "/live"),
						playlists: new Firebase(Spank.base.users + friendData.username + "/playlists")
					};
				}
			};

			ko.applyBindings(Spank.friends, document.getElementById('friendList'));

			Spank.friends.visible.subscribe(function(v) {
				var p = v ?	"brightness(0)" : "grayscale(1)",
					mode = v ? "show" : "hide";
				$("#friends_button").css("webkitFilter", p);
				var friendList = $("#friendList-container");
				if (mode==='show') {
					friendList.slideDown('fast','swing', function() {});
				} else {
					friendList.slideUp('fast','swing', function(){});
				}
			});

			$("#friends_button").click(function() {
				var current = Spank.friends.visible();
				Spank.friends.visible(!current);
			});

			$.each(FBUserInfo.friends, function (i,FBo) {
				var SpankO = {};
				var FBUsername = FBo.username==="" ? FBo.uid : FBo.username;
				SpankO.name = FBo.name;
				SpankO.username = Spank.utils.toFirebaseName(FBUsername);
				SpankO.picture = "https://graph.facebook.com/" + FBUsername + "/picture";
				SpankO.frequency = 1;

				var friendUrl = Spank.base.myFriends + "/" + SpankO.username,
					friendBase = new Firebase(friendUrl);
				friendBase.on('value', function (snapshot) {
					var friendData = snapshot.val();
					if (friendData===null) {
						console.error("Pushing new friend:" + SpankO.username);
						friendBase.set(SpankO)
					} else {
						if (!(snapshot.name() in Spank.friends.bases)) {
							Spank.friends.addNewFriend(friendData);
							console.warn("Pulling friend to list: " + friendData.username);
						} else {
							var observable = Spank.friends.bases[snapshot.name()].observable;
							$.each(friendData, function(k,v) {
								observable[k](v);
							})
						}
					}
				});
			});

			var sentMailSound = new Audio("/static/sounds/mailsent.mp3");
			sentMailSound.load();

			$("#sendSongForm").submit(function(event) {
				var messageField = $("#sendMessage"),
					message = messageField.val();
				Spank.sendToFriend(message);
				$(this).hide();
				messageField.val("");
				sentMailSound.play();
				return false;
			});

			ko.bindingHandlers.droppableFriend = {
				init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
					$(element).droppable({
						greedy: true,
						accept: ".tweetThumb",
						tolerance: "pointer",
						hoverClass: "friendHover",
						drop: function(event, ui) {
//// Prevent intercept of drop by other elements underneath
							document._ignoreDrop = true;
							setTimeout(function() {
								document._ignoreDrop = false;
							},1000);
//// Serious fucking Jquery UI bug, unresolved even at 1.9.2
							ui.draggable.detach();
							document._draggedHistoryItemUIParent.prepend(ui.draggable);
//// Begin actual...
							var koo = valueAccessor(),
								friendData = ko.toJS(koo),
								friendsHistory = Spank.friends.bases[friendData.username].history,
								droppedHistoryItem = JSON.parse(JSON.stringify(document._draggedHistoryItem));
							// This is a callback function for $("#sendSongForm").submit
							Spank.sendToFriend = function(message) {
								message = message.length>0 ? message : "This is awwweesooomme!";
								friendsHistory.transaction(function(currentData) {
									droppedHistoryItem.gift = {
										from:FBUserInfo.name,
										message: message
									};
									if (currentData!==null) {
										currentData.unshift(droppedHistoryItem);
									}
									return currentData;
								}, function onSendComplete(success, data) {
									Spank.friends.bases[friendData.username].base.transaction(function(currentData) {
										currentData.frequency = currentData.frequency+1;
										return currentData;
									}, function onUpdateFreqComplete(success, data) {
										console.log(data.val());
										window.notify.information("Shared '" + droppedHistoryItem.title + "' with " + friendData.name);
									});
								});
							};
							$("#sendSongForm").slideDown('fast','swing');
						}
					});
				}
			};

		});

	});


})();

