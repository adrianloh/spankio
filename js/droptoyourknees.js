Dropzone.autoDiscover = false;

$(document).ready(function() {

	$(document).one("baseReady", function() {

		// Refer to: http://www.dropzonejs.com/#configure

		var server = "@aspasia",
			uploadServer = Spank.servers[server],
			keyBase = Spank.username + "/",
			uploadZone,
			fileNames = [],
			uploadForm = $("#my-awesome-dropzone");
		uploadZone = new Dropzone("#my-awesome-dropzone", {url: uploadServer});

		$("#closeUploadZone").click(function() {
			$(".dropzoneContainer").hide();
		});

		Spank.dropBabyDrop = function() {
			$(".dropzoneContainer").show();
		};

		uploadZone.on("sending", function(file, xhr, formData) {
			file.uuidName = Spank.utils.guid().replace(/-/g,"") + ".mp3";
			formData.append("key", keyBase + file.uuidName);
			formData.append("Content-Type", file.type);
			formData.append("x-amz-storage-class", "REDUCED_REDUNDANCY");
			formData.append("acl", "public-read-write");
			formData.append("Cache-Control", "public, max-age=31536000");
		});

		uploadZone.on("success", function(file) {
			if (file.hasOwnProperty('songData') && file.hasOwnProperty("uuidName")) {
				var koo = {}, songData = file.songData;
				koo.artist = songData.artist;
				koo.title = songData.title;
				koo.thumb = "http://d1vkkvxpc2ia6t.cloudfront.net/albumempty2.png";
				koo.url = server + "_" + Spank.username + "/" + file.uuidName;
				koo.direct = uploadServer + "/" + keyBase + file.uuidName;
				Spank.lightBox.addSongToStream(koo);
				uploadZone.removeFile(file);
			} else {
				console.error("File uploaded but file doesn't contain info. Cannot inject into stream.");
				console.error(file);
			}

		});

	});

});