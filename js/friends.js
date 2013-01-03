(function(){

	$(document).ready(function () {

		$(document).one("baseReady", function () {

			Spank.base.myFriends = Spank.base.me.child("friends");

			$.each(FBUserInfo.friends, function (i,FBo) {
				var SpankO = {};
				var FBUsername = FBo.username==="" ? FBo.uid : FBo.username;
				SpankO.name = FBo.name;
				SpankO.username = Spank.utils.toFirebaseName(FBUsername);
				SpankO.picture = "https://graph.facebook.com/" + FBUsername + "/picture";
				SpankO.frequency = 1;

				var friendBase = Spank.base.myFriends.child(SpankO.username);
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
							});
						}
					}
				});
			});

		});

		var sentMailSound = new Audio("/static/sounds/mailsent.mp3");
		sentMailSound.load();

		ko.bindingHandlers.droppableFriend = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).droppable({
					greedy: true,
					accept: ".tweetThumb, .playlistThumb",
					tolerance: "pointer",
					hoverClass: "friendHover",
					drop: function(event, ui) {
//// Prevent intercept of drop by other elements underneath
						document._ignoreDrop = true;
						setTimeout(function() {
							document._ignoreDrop = false;
						},1000);
						var koo = valueAccessor(),
							friendData = ko.toJS(koo),
							droppedHistoryItem;
						if (ui.draggable.hasClass('playlistThumb')) {
							droppedHistoryItem = document._draggedHistoryItem;
							droppedHistoryItem.base.owners.transaction(function(currentData) {
								if (currentData.indexOf(friendData.username)>=0) {
									window.notify.information("Already sharing this playlist with " + friendData.name);
									return undefined;
								} else {
									currentData.push(friendData.username);
									return currentData;
								}
							}, function onComplete(ok) {
								if (ok) {
									window.notify.information("Shared '" + droppedHistoryItem.title + "' with " + friendData.name);
								}
							});
						} else if (ui.draggable.hasClass('tweetThumb')) {
//// Serious fucking Jquery UI bug, unresolved even at 1.9.2
							ui.draggable.detach();
							ui.draggable.insertAfter(document._draggedHistoryItemUIParent);
//// Begin actual...
							var	friendsHistory = Spank.friends.bases[friendData.username].history;
							droppedHistoryItem = JSON.parse(JSON.stringify(document._draggedHistoryItem));
							Spank.sendToFriend = function(message) {
								message = message.length>0 ? message : "This is awwweesooomme!";
								friendsHistory.transaction(function(currentData) {
									droppedHistoryItem.gift =
									{
										from:FBUserInfo.name,
										message: message
									};
									if (currentData!==null) currentData.push(droppedHistoryItem);
									return currentData;
								}, function onSendComplete(success, data) {
									Spank.friends.bases[friendData.username].base.transaction(function(currentData) {
										currentData.frequency = currentData.frequency+1;
										return currentData;
									}, function onUpdateFreqComplete(success, data) {
										window.notify.information("Shared '" + droppedHistoryItem.title + "' with " + friendData.name);
									});
								});
							};
							Spank.getInput.show(function(message) {
								Spank.sendToFriend(message);
								sentMailSound.play();
							},{
								title: "Send it with a message!",
								placeholder: "This is aawwwesomee",
								submitmessage: "Send"
							});
						}
					}
				});
			}
		};

		Spank.friends = {
			visible: ko.observable(false),
			bases:{},
			friendlist: ko.observableArray([]),
			addNewFriend: function(friendData) {
				var self = this,
					koo = {},
					friendname = friendData.username;
				$.each(friendData, function(k,v) {
					koo[k] = ko.observable(v);
				});
				self.friendlist.push(koo);
				Spank.watchPlaylistRefsBelongingTo(friendname);
				var friendBase = Spank.base.users.child(friendname);
				self.bases[friendname] = {
					observable: koo,
					base: Spank.base.myFriends.child(friendname),
					history: friendBase.child("history"),
					live: friendBase.child("live"),
					playlists: friendBase.child("playlists")
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

	});


})();

