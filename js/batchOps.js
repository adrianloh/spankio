/*global $, ko, Spank */

(function() {

	$(document).ready(function() {

		Spank.batchOps = (function() {
			var self = {};
			self.stashedCartItems = ko.observableArray([]);
			self.batchItems = Spank.history.batchItems;
			self.shoppingCart = Spank.charts.shoppingCart;
			self.isInChartsView = ko.computed(function() {
				return !Spank.charts.userPlaylistIsOpen();
			});
			self.showBatchItems = ko.computed(function() {
				return false;
//				return Spank.history.batchItems().length>0 && self.isInChartsView();
			});
			self.isPastable = ko.computed(function() {
				return (self.batchItems().length + self.stashedCartItems().length !== 0) && !self.isInChartsView() && Head.playlistProperties.isMine();
			});
			self.show = ko.observable(false);
			self.batchOpsActive = ko.computed(function() {
				return self.shoppingCart().length + self.batchItems().length + self.stashedCartItems().length !== 0;
			});
			self.batchOpsActive.subscribe(function(val) {
				var info = $("#playlistInfo"),
					prop = $("#playlistProperties"),
					trigger = function() {
						setTimeout(function() {
							$("#resultsSection").trigger("scroll");
						}, 100);
					};
				if (info.css("display")!=='none') {
					if (info.position().top<=111) {
						trigger();
					}
				} else {
					if (prop.position().top<=85) {
						trigger();
					}
				}
			});
			self.batchOpsActive.subscribe(function(yes) {
				if (yes) {
					setTimeout(function() {
						$("#batchOperations").addClass("batchOperations_show");
					}, 50);
				} else {
					$("#batchOperations").removeClass("batchOperations_show");
				}
			});
			self.shoppingCartCount = ko.computed(function() {
				if (self.batchItems().length>0) {
					return self.batchItems().length;
				} else {
					return self.stashedCartItems().length;
				}
			});
			var strip = Spank.utils.stripToLowerCase;
			self.numberOfSelectedItemsInOpenPlaylist = ko.observable(0);
			self.hasItemsToAddToStream = ko.computed(function() {
				return self.batchItems().length>0 && !Spank.history.hideFreshies();
			});
			self.hasDeletableItems = ko.computed(function() {
				return ((self.batchItems().length>0 && Spank.history.hideFreshies()) || (!self.isInChartsView() && Head.playlistProperties.isMine() && self.numberOfSelectedItemsInOpenPlaylist()>0));
			});
			self.isCuttable = ko.computed(function() {
				return !self.isInChartsView() && self.batchItems().length===0 && Head.playlistProperties.isMine() && self.numberOfSelectedItemsInOpenPlaylist()>0;
			});
			self.pageRefresh = function() {
				self.shoppingCart([]);
				self.numberOfSelectedItemsInOpenPlaylist(0);
			};
			self.saveCartAndEmpty = function() {
				self.batchCopy();
				self.pageRefresh();
			};
			self.getAllItemsNoKO = function() {
				var batchItems = ko.observableArray([]);
				[self.batchItems, self.shoppingCart, self.stashedCartItems].forEach(function(o) {
					batchItems.unshift.apply(batchItems, ko.toJS(o).reverse());
				});
				return ko.toJS(batchItems);
			};
			self.newMixFromBatch = function() {
				var batchItems = self.getAllItemsNoKO(),
					data = {
						title: "Name your new playlist!",
						placeholder: "",
						submitmessage: "OK"
					};
				Spank.getInput.show(function(playname) {
					playname = playname || data.placeholder;
					var saveData = {
						title: playname,
						list: batchItems,
						owners:[Spank.username, 'everyone']
					};
					var newRef = Spank.base.me.child("playlists").push(saveData, function afterSave(error) {
						window.notify.success("Created new playlist " + playname);
						Spank.base.me.child("playlistRefs").transaction(function(currentData) {
							if (currentData===null) {
								return [newRef.name()];
							} else {
								currentData.push(newRef.name());
								return currentData;
							}
						}, function onComplete(error, comitted, snapshot, dummy) {
							if (!comitted) return;
							self.emptyAllBatches();
							var ppiSelector = ".playlist-type-btn[value='ppi-me']",
								pSelector = ".playlistThumb[title='#']".replace("#",playname);
							setTimeout(function() {
								$(ppiSelector).trigger("click");
								$(pSelector).trigger("click");
							}, 1000);
						});
					});
				}, data);
			};
			self.addToStream = function() {
				var batchItems = self.getAllItemsNoKO();
				Spank.history.prependToHistory(batchItems, false);
			};
			self.batchCopy = function() {
				var dx = [], tt, len = self.stashedCartItems().length;
				while (len--) {
					var o = self.stashedCartItems()[len];
					tt = strip(o.artist)+strip(o.title);
					dx.push(tt);
					dx.push(o.url);
				}
				len = self.shoppingCart().length;
				while (len--) {
					o = ko.toJS(self.shoppingCart()[len]);
					tt = strip(o.artist)+strip(o.title);
					if (dx.indexOf(o.url)>=0 || dx.indexOf(tt)>=0 ) {
						// A track in the existing set matches a track we're trying to insert
					} else {
						self.stashedCartItems.push(o);
						dx.push(tt);
						dx.push(o.url);
					}
				}
				self.pageRefresh();
			};
			self.pasteToMix = function() {
				var batchItems = self.getAllItemsNoKO();
				Head.unshiftIntoOpenPlaylist(batchItems);
			};
			self.cutCartItems = function() {
				var shoppingCartItems = self.shoppingCart(),
					dx = [], tt;
				$.each(shoppingCartItems, function(i,o) {
					tt = strip(o.artist)+strip(o.title);
					dx.push(tt);
					dx.push(o.url);
				});
				Head.playlists.lastKoo.base.tracklist.transaction(function(currentData) {
					var newArray = [];
					for (var i= 0, len=currentData.length; i<len; i++) {
						var o = currentData[i],
							tt = strip(o.artist)+strip(o.title);
						if (dx.indexOf(o.url)>=0 || dx.indexOf(tt)>=0 ) {
							// A track in the existing set matches a track we're trying to insert
						} else {
							newArray.push(o);
						}
					}
					return newArray;
				});
				self.saveCartAndEmpty();
			};
			self.deleteBatch = function() {
				if (self.batchItems().length>self.shoppingCart().length) {
					Spank.history.deleteBatch();
				} else {
					var koo = Head.playlists.lastKoo,
						shoppingCartItems = self.shoppingCart(),
						playlistItems = Spank.charts.chartTracks();

					function cancel($noty) {
						$noty.close();
					}

					function deleteCartItems($noty) {
						$noty.close();
						var dx = [], tt;
						$.each(shoppingCartItems, function(i,o) {
							tt = strip(o.artist)+strip(o.title);
							dx.push(tt);
							dx.push(o.url);
						});
						Head.playlists.lastKoo.base.tracklist.transaction(function(currentData) {
							var newArray = [];
							for (var i= 0, len=currentData.length; i<len; i++) {
								var o = currentData[i],
									tt = strip(o.artist)+strip(o.title);
								if (dx.indexOf(o.url)>=0 || dx.indexOf(tt)>=0 ) {
									// A track in the existing set matches a track we're trying to insert
								} else {
									newArray.push(o);
								}
							}
							return newArray;
						});
						self.shoppingCart([]);
						self.numberOfSelectedItemsInOpenPlaylist(0);
					}

					function destroyPlaylist($noty) {
						$noty.close();
						Head.playlists.destroyOpenPlaylist();
						Spank.charts.resetShoppingCart();
					}

					(function() {
						var message,
							buttons = [{addClass: 'btn btn-danger', text: 'Cancel', onClick: cancel}];
						if (shoppingCartItems.length===playlistItems.length) {
							message = "Removing all tracks will delete this playlist!";
							buttons.unshift({addClass: 'btn btn-primary', text: 'OK', onClick: destroyPlaylist});
						} else if (shoppingCartItems.length>0) {
							message = "Delete currently selected items?";
							buttons.unshift({addClass: 'btn btn-primary', text: 'OK', onClick: deleteCartItems});
						}
						var n = noty({
							text: message,
							type: 'alert',
							dismissQueue: true,
							layout: 'center',
							theme: 'defaultTheme',
							buttons: buttons
						});
					})();

				}
			};
			self.emptyAllBatches = function(data, event) {
				if (self.batchItems().length>0) {
					self.batchItems([]);
				}
				self.shoppingCart([]);
				var l = self.stashedCartItems().length;
				if (l>0) {
					window.notify.confirm("There are @ items in your shopping cart. Remove them?".replace("@", l),
						function() {
							self.stashedCartItems([]);
						});
				} else {
					self.stashedCartItems([]);
				}
			};
			self.onClickBatchItem = function(data, event) {
				Spank.lightBox.open(data);
			};

			var defocused = false,
				shoppingCartStuff = [];
//			self.batchItems.subscribe(function(data) {
//				if (data.length>0 && !defocused && self.isInChartsView()) {
//					defocused = true;
//					Spank.disableDropZones(true);
//					$(".logoHolder, #searchForm, #resultsSection, #playlistProperties").addClass("defocus");
//				} else if (data.length===0) {
//					defocused = false;
//					Spank.disableDropZones(false);
//					$(".logoHolder, #searchForm, #resultsSection, #playlistProperties").removeClass("defocus");
//				} else { }
//			});
			return self;
		})();

		ko.applyBindings(Spank.batchOps, document.getElementById("batchSection"));

	});

})();