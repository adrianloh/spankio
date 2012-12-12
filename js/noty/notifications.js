(function() {

	$(document).ready(function() {

		function generate(type, message) {
			var n = noty({
				text: message,
				type: type,
				dismissQueue: true,
				layout: 'topLeft',
				theme: 'defaultTheme',
				timeout: 2500
			});
		}

		function generateAll() {
			generate('alert');
			generate('information');
			generate('error');
			generate('warning');
			generate('notification');
			generate('success');
		}

		var types = ['alert', 'information', 'error', 'warning', 'notification', 'success'];
		window.notify = {last_message:""};

		$.each(types, function(i,k) {
			window.notify[k] = function(message) {
				if (!(message===window.notify.last_message)) {
					generate(k, message);
					window.notify.last_message = message;
				}
			}
		});

		Spank.notifyCurrentSong = function(message) {
			var n = noty({
				text: message,
				type: 'information',
				dismissQueue: true,
				layout: 'topRight',
				theme: 'defaultTheme',
				timeout: 30000,
				closeWith: ['hover']
			});
		};

	});







})();