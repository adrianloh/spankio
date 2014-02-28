/*global $, ko, Spank */

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

		var sentMailSound;

		function notifyCannotShare(droppedHistoryItem, friendName) {
			window.notify.error("Crap! Delivery of " + droppedHistoryItem.title + " to " + friendName + " failed. Try again later.", 5000);
		}

		ko.bindingHandlers.droppableFriend = {
			init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
				$(element).droppable({
					greedy: true,
					accept: ".tweetItem, .playlistThumb",
					tolerance: "pointer",
					hoverClass: "friendHover",
					drop: function(event, ui) {
						var koo = valueAccessor(),
							friendData = ko.toJS(koo),
							droppedHistoryItem;
						if (ui.draggable.hasClass('tweetItem')) {
							var	friendsHistory = Spank.friends.bases[friendData.username].history;
							droppedHistoryItem = ko.toJS(ui.draggable.data("koo"));

							Spank.getInput.show(function(message) {
								sendToFriend(message);
								sentMailSound.play();
							},{
								title: "Send it with a message!",
								placeholder: "This is aawwwesomee",
								submitmessage: "Send"
							});
							
							function sendToFriend(message) {
								var isUserOgg = new RegExp("^@.*" + Spank.username + "/.*ogg$");
								message = message.length>0 ? message : "This is awwweesooomme!";
								if (droppedHistoryItem.url.match(isUserOgg)) {
									Spank.alembic.clone(droppedHistoryItem.direct, "mp3", function(res) {
										if (res.ok) {
											sendOut();
										} else {
											notifyCannotShare(droppedHistoryItem, friendData.name);
										}
									});
								} else {
									sendOut();
								}

								function sendOut() {
									friendsHistory.transaction(function(currentData) {
										droppedHistoryItem.url = droppedHistoryItem.url.replace(/...$/, "mp3");
										droppedHistoryItem.direct = droppedHistoryItem.direct.replace(/...$/, "mp3");
										droppedHistoryItem.gift =
										{
											from:FBUserInfo.name,
											message: message
										};
										if (currentData!==null) {
											currentData.push(droppedHistoryItem);
										} else {
											currentData = [droppedHistoryItem];
										}
										return currentData;
									}, function onComplete(error) {
										if (!error) {
											Spank.friends.bases[friendData.username].base.transaction(function(currentData) {
												currentData.frequency = currentData.frequency+1;
												return currentData;
											}, function onComplete() {
												window.notify.information("Shared '" + droppedHistoryItem.title + "' with " + friendData.name);
											});
										} else {
											console.log(error);
											notifyCannotShare(droppedHistoryItem, friendData.name);
										}
									});
								}
							}
						} else if (ui.draggable.hasClass('playlistThumb')) {
							droppedHistoryItem = document._draggedHistoryItem;
							droppedHistoryItem.base.owners.transaction(function(currentData) {
								if (currentData.indexOf(friendData.username)>=0) {
									window.notify.information("Already sharing this playlist with " + friendData.name);
									return undefined;
								} else {
									currentData.push(friendData.username);
									return currentData;
								}
							}, function onComplete(error, comitted, snapshot, dummy) {
								if (comitted) {
									window.notify.information("Shared '" + droppedHistoryItem.title() + "' with " + friendData.name);
								}
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
			var mode = v ? "show" : "hide",
				friendList = $("#friendList-container"),
				friendButton = $("#friends_button");
			if (mode==='show') {
				Spank.disableDropZones(true);
				friendButton.data("on")();
				friendList.fadeIn('fast','swing', function() {});
				$("#resultsSection, #playlistProperties").addClass("defocus");
			} else {
				Spank.disableDropZones(false);
				friendButton.data("off")();
				friendList.fadeOut('fast','swing', function(){});
				$("#resultsSection, #playlistProperties").removeClass("defocus");
			}
		});

		$("#friends_button").click(function() {
			sentMailSound = new Audio("/static/mailsent.mp3");
			sentMailSound.load();
			var current = Spank.friends.visible();
			Spank.friends.visible(!current);
		});

	});


})();