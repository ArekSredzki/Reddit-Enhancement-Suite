modules['imageUpload'] = {
	moduleID: 'imageUpload',
	moduleName: 'Image uploader',
	category: 'Posts',
	options: {
		preferredHost: {
			type: 'ajaxradios',
			value: 'random',
			extra: 'random',
			description: 'Select your preferred image host (It will be autoselected but you can still change it on the page).',
			source: 'http://cloudpix.co/api/res/hosts'
		},
		accountAuthorization: {
			type: 'oauth2',
			sourceOptionName: 'preferredHost'
		}
	},
	description: 'Quickly and easily upload images right from the submit page.',
	isEnabled: function() {
		return RESConsole.getModulePrefs(this.moduleID);
	},
	include: [
		/^https?:\/\/([a-z]+)\.reddit\.com\/r\/[-\w\.]*\/submit\/?/i,
		/^https?:\/\/([a-z]+)\.reddit\.com\/submit\/?/i
	],
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	go: function() {
		if ((this.isEnabled()) && (this.isMatchURL())) {
			if (!Date.now) {
				Date.now = function() { return new Date().getTime(); };
			}
			var timeNow = Math.round(Date.now()/1000);
			var hash = window.location.hash;
			if (hash.substring(0, 6) == '#host=') {
				var params = {}, queryString = location.hash.substring(1),
					regex = /([^&=]+)=([^&]*)/g, m;
				while (m = regex.exec(queryString)) {
					params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
				}
				var host = params.host;
				var token_type = params.token_type.charAt(0).toUpperCase() + params.token_type.substring(1);
				RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + host + '.accessToken', params.access_token);
				RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + host + '.accessTokenExpiry', parseInt(params.expires_in, 10) + timeNow);
				RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + host + '.refreshToken', params.refresh_token);
				RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + host + '.tokenType', token_type);
				RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + host + '.username', params.account_username);
				window.location.hash = '';
				location.reload();
			} else {
				var lastUpdate = parseInt(RESStorage.getItem('RESmodules.imageUpload.preferredHost.lastUpdate'), 10) || 0;
				var json = JSON.parse(RESStorage.getItem('RESmodules.imageUpload.preferredHost.json')) || [];
				// Update if more than an hour has passed
				if ((timeNow - lastUpdate > 3600) || (json === 'undefined') || (json === 'null')) {
					$.ajax({
						url: modules['imageUpload'].options.preferredHost.source,
						async: false,
						dataType: 'json',
						success: function (json2) {
							json = json2.hosts;
						}
					});
					RESStorage.setItem('RESmodules.imageUpload.preferredHost.lastUpdate', timeNow);
					RESStorage.setItem('RESmodules.imageUpload.preferredHost.json', JSON.stringify(json));
				}

				var selected = modules['imageUpload'].options.preferredHost.value;

				if (selected != 'random') {
					if ($.grep(json, function(e){ return e.id === selected; }).length == 0) {
						selected = 'random';
						RESUtils.setOption('imageUpload', 'preferredHost', selected);
					}
				}

				if (selected == 'random')
					selected = json[Math.floor(Math.random() * (json.length))].id;

				var selectedHost = $.grep(json, function(e){ return e.id === selected; });
				var selectedHost = selectedHost[0];
				var authHeader = this.getAuthHeader(selectedHost);
				var username = this.getAuthUsername(selectedHost);

				$("#url-field").append( "<div> <span class='title'>image</span> <div class='roundfield-content'> <form id='imageUpload' style='font-size: small;'>"+
								"<div id='fine-uploader'></div>"+
								"<select form='imageUpload' id='host' name='host'>"+
								"</select>&nbsp;&nbsp;&nbsp;"+
								"<span>By uploading to this host you accept <a href='"+selectedHost.options.termsURL+"' id='host-terms'>these terms</a>.</span><br>"+
								"<span id='restrictions'>Restrictions:"+selectedHost.options.maxSizeH.replace(new RegExp(',', 'g'), '<br> - ').replace('logged in', '<a href="#!settings/imageUpload">logged in</a>').replace('null', 'None')+"</span>"+
								"<span id='username' style='font-style:italic;'></span>"+
							"<form> </div> </div>"+
							'<script type="text/template" id="qq-template"><div class="qq-uploader-selector qq-uploader"><div class="qq-upload-drop-area-selector qq-upload-drop-area" qq-hide-dropzone><span>Drop files here to upload</span></div><div class="qq-upload-button-selector qq-upload-button"><div>Upload a file</div></div><span class="qq-drop-processing-selector qq-drop-processing"><span>Processing dropped files...</span></span></span><ul class="qq-upload-list-selector qq-upload-list"><li><div class="qq-progress-bar-container-selector"><div class="qq-progress-bar-selector qq-progress-bar"></div></div><span class="qq-upload-file-selector qq-upload-file"></span><input class="qq-edit-filename-selector qq-edit-filename" tabindex="0" type="text"><span class="qq-upload-size-selector qq-upload-size"></span><a class="qq-upload-cancel-selector qq-upload-cancel" href="#">Cancel</a><a class="qq-upload-retry-selector qq-upload-retry" href="#">Retry</a><a class="qq-upload-delete-selector qq-upload-delete" href="#">Delete</a><span class="qq-upload-status-text-selector qq-upload-status-text"></span><a class="qq-upload-view qq-hide btn">View</a></li></ul></div></script>' );
				$.each(json, function (index, value) {
					if (value.id == selected)
						$("#host").append('<option value="' + value.id + '" selected>' + value.name + '</option>');
					else
						$("#host").append('<option value="' + value.id + '">' + value.name + '</option>');
				});
				if (username != 'Unknown')
					$("#username").html('<br>Authorized as: ' + username);

				$(document).ready(modules['imageUpload'].setupUploader(selectedHost, authHeader));

				$("#fine-uploader").on("complete", function (event, id, name, response) {
					if (response.success) {
						$("#url").attr("value", response.data.link);
						$("#title-field").find('textarea[name="product_question"]').val(response.data.title);
						$fileItem = $(this).fineUploader("getItemByFileId", id);

						if (response.data.hasOwnProperty('editlink'))
							var viewlink = response.data.editlink;
						else
							var viewlink = response.data.link;

						$fileItem.find(".qq-upload-view")
							.attr("href", viewlink)
							.removeClass("qq-hide");
					}
				});

				$('#host').on('change', function(){
					selected = $(this).val();
					selectedHost = $.grep(json, function(e){ return e.id == selected; });
					selectedHost = selectedHost[0];
					$("#host-terms").attr("href", selectedHost.options.termsURL);
					$("#restrictions").html('Restrictions:' + selectedHost.options.maxSizeH.replace(new RegExp(',', 'g'), '<br> - ').replace('logged in', '<a href="#!settings/imageUpload">logged in</a>').replace('null', 'None'));
					var authHeader = modules['imageUpload'].getAuthHeader(selectedHost);
					var username = modules['imageUpload'].getAuthUsername(selectedHost);
					if (username != 'Unknown')
						$("#username").html('<br>Authorized as: ' + username);
					else
						$("#username").html('');
					modules['imageUpload'].setupUploader(selectedHost, authHeader);
				});
			}
		}
	},
	setupUploader: function (selectedHost, authHeader) {
		if (authHeader != null) {
			$("#fine-uploader").fineUploader({
				request:{
					inputName: selectedHost.options.fileField,
					endpoint: selectedHost.options.APIURL,
					customHeaders: {
						"Authorization": authHeader
					}
				},
				cors:{
					expected: true,
					allowXdr: true
				},
				multiple: false,
				validation: {
					allowedExtensions: ['jpeg', 'jpg', 'png', 'gif', 'tiff', 'bmp', 'raw', 'exif'],
					sizeLimit: selectedHost.options.maxSize
				},
				failedUploadTextDisplay: {
					mode: 'custom',
					maxChars: 100,
					responseProperty: 'data',
					responseProperty2: 'error'
				}
			});
		} else {
			$("#fine-uploader").fineUploader({
				request:{
					inputName: selectedHost.options.fileField,
					endpoint: selectedHost.options.APIURL
				},
				cors:{
					expected: true,
					allowXdr: true
				},
				multiple: false,
				validation: {
					allowedExtensions: ['jpeg', 'jpg', 'png', 'gif', 'tiff', 'bmp', 'raw', 'exif'],
					sizeLimit: selectedHost.options.maxSize
				},
				failedUploadTextDisplay: {
					mode: 'custom',
					maxChars: 100,
					responseProperty: 'data',
					responseProperty2: 'error'
				}
			});
		}
	},
	getAuthHeader: function (selectedHost) {
		if (selectedHost.options.Oauth2) {
			var refreshToken = RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.refreshToken') || 'noAuth';
			var accessToken = RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.accessToken') || 'noAuth';
			if (refreshToken != 'noAuth') {
				var accessTokenExpiry = parseInt(RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.accessTokenExpiry'), 10) || 0;
				var tokenType = RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.tokenType') || 'noAuth';
				var username = RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.username') || 'noAuth';
				if (!Date.now) {
					Date.now = function() { return new Date().getTime(); };
				}
				var timeNow = Math.round(Date.now()/1000);
				if ((accessTokenExpiry - timeNow) < 120 || accessToken == 'noAuth') {
					var formData = new FormData();
					formData.append('refresh_token', refreshToken);
					formData.append('client_id', selectedHost.options.clientID);
					formData.append('client_secret', selectedHost.options.clientSecret);
					formData.append('grant_type', 'refresh_token');
					var req = new XMLHttpRequest();
					req.open("POST",selectedHost.options.refreshURL,false);
					req.send(formData);
					var json = JSON.parse(req.responseText);
					var timeNow = Math.round(Date.now()/1000);
					var tokenType = json.token_type.charAt(0).toUpperCase() + json.token_type.substring(1);
					RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.accessToken', json.access_token);
					RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.accessTokenExpiry', json.expires_in + timeNow);
					RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.tokenType', tokenType);
					RESStorage.setItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.username', json.account_username);
					accessToken = json.access_token;
				}
				return tokenType + ' ' + accessToken;
			} else return 'Client-ID ' + selectedHost.options.clientID;
		} else return null;
	},
	getAuthUsername: function (selectedHost) {
		if (selectedHost.options.Oauth2) {
			var refreshToken = RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.refreshToken') || 'noAuth';
			if (refreshToken != 'noAuth') {
				return RESStorage.getItem('RESmodules.imageUpload.accountAuthorization.' + selectedHost.id + '.username') || 'Unknown';
			} else return 'Unknown';
		} else return 'Unknown';
	}
};