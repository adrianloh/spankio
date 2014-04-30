$(document).ready(function() {

	function generate(type, message, duration) {
		var n = noty({
			text: message,
			type: type,
			dismissQueue: true,
			layout: 'topLeft',
			theme: 'defaultTheme',
			timeout: duration
		});
	}

	var types = ['alert', 'information', 'error', 'warning', 'notification', 'success'];

	window.notify = {suspended: false, last_message:"", lastMessageTime:0};

	$.each(types, function(i,k) {
		window.notify[k] = function(message, duration) {
			duration = duration || 2500;
			generate(k, message, duration);
		}
	});

	window.notify.confirm = function(message, callbackOK, callbackCancel) {
		var n = noty({
			text: message,
			type: 'alert',
			dismissQueue: true,
			layout: 'center',
			theme: 'defaultTheme',
			buttons: [
				{addClass: 'btn btn-primary', text: 'OK', onClick: function($noty) {
					$noty.close();
					callbackOK();
				}
				},
				{addClass: 'btn btn-danger', text: 'Cancel', onClick: function($noty) {
					$noty.close();
					if (callbackCancel) callbackCancel();
				}
				}
			]
		});
	}

});