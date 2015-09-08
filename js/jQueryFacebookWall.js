/**
 * jQuery Facebook Wall Plugin
 * @author: Lorenzo Gangi lorenzogangi@gmail.com
 * @license: see /licensing/readme_license.txt
 * @copyright
 * @version 2.0
 */


;(function ( $, window, document, undefined ) {

   
    // Create the defaults once
    var pluginName = "jQueryFacebookWall";
    
	/*default options ['possible','option','values']*/
	var defaults = {
		appId: false,        //facebook applicaton id see readme for how to get this
		domain: false,       //domain of where the plugin is installed, so facebook can authenticate
		installDirectory: '/jQueryFacebookWall/', //where the plugin lives relative to your web root
 		facebookUser: false, //your facebook account name
		display: 'timeline', //the display style of the wall, possible values are 'wall', 'timeline', 'single-column'
		displayAnimation: true, //apply css animation to loading feed
		displayAnimationDelay: 200, // how fast the display animation will be seperated by in milliseconds
		language: 'english', //select language 'english', 'italiano', 'espanol', 'francais', 'svenska'
		likeAndCommentBackup: "popup", //"popup" || "tab" Show posts in a popup or a new tab if facebook does not accept like or comment post
		facebookLoginButton: {
			show: true,
			position: "left" //align the button at the "left", "center", "right"	
		},
		posts:{
			show: true,
			feedType: 'feed', // ['feed','posts'] feed type defines if you would like to show the facebook users feed (include posts from other users) or posts (only posts from fb user)
			limit: 10,	      // number of posts to retrieve
			order: 5
		},
		comments: {
			limit :5000,	 //max number of comments returned from facebook, 5000 is the max value fb allows
			showAtStart : 2, //the number of comments to show when the wall first loads, use 'All' to show all posts on load
			showMoreNum : 50 //the number of comments that will be revieled when the 'view more comments' link is clicked for a story		
		},
		likes: {
			show: true,            //show what your facebook account likes
			useCoverPhotos: false, //show only likes that have cover photos defined, and display the cover photo
			limit: 5,	           //number of likes to retireve
			order: 4,              //order
			minLikes: 0            //filter the post feed stories by minimum number of likes, ie show only popular posts
		},
		albums:{
			show: true,  //whether or not to show albums
			limit: 2,	 //number of albums to show
			order: 3,
			filterAlbums: false 
		},
		photos:{
			show: true,
			type: 'uploaded', // ['profile','uploaded','tagged']what type of photos to show
			numColumns: 4, //the number of image columns you want in the photos section 2-4, you may want to adjust the image height in jQueryFacebookWall.css => .facebook-wall.timeline .photos .photo-cover-photo-wrapper 
			showAtStart: 12, //number of photos to show on the wall
			limit:25, //total number of photos to retrieve from fb, you can scroll through in the light box gallery	
			order: 2
		},
		events:{
			show: true, //whether to show events or not
			showPastEvents: false, //show past events that are still in your facebook account, false to not show, 0 to show all, or mm/dd/yy to show events starting from a specific date.
			showTicketLink: false, // show the ticket links for events.3/14/14 Currently unavailable because of Facebook graph API Possibly a temporary issue due to downtime
			limit: 10,	//number of events to show
			order: 1
		},
		debug:false     //turn console debugging info on or off
	};

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;
        this.options = $.extend( true, {}, defaults, options) ;
        this._defaults = defaults;
        this._name = pluginName;
        //facebook app object
		this.app = {};
		//current fb user
		this.currentUser = {};
		this.init();
    }

    Plugin.prototype = {

		
			

        init: function() {
            // Place initialization logic here
            // You already have access to the DOM element and
            // the options via the instance, e.g. this.element
            // and this.options
            // you can add more functions like the one below and
            // call them like so: this.yourOtherFunction(this.element, this.options).
			
			 // cache a copy of this for use in nested functions;
			 var _this = this;
			 //cache a jQuery wrapped reference the plugin element
			 this.$element= $(this.element); 
		
			 
			 //are they logged into facebook
			 this.loggedIn = false;
		
			 //load the facebook js SDK
			 if(this.options.appId && this.options.domain){
		   		this._fbInitSDK();
		     }
		     else{
				console.log('Error: Your appId or domain is not defined in your plugin declaration..')   
		     }
			  
			 //set the language
			 jQFWlanguage.language = this.options.language;
			 
			 //now that the language has been set localize the months and days
			 this.weekday = new Array(
				jQFWlanguage.localize("Sunday"),
				jQFWlanguage.localize("Monday"),
				jQFWlanguage.localize("Tuesday"),
				jQFWlanguage.localize("Wednesday"),
				jQFWlanguage.localize("Thursday"),
				jQFWlanguage.localize("Friday"),
				jQFWlanguage.localize("Saturday")
			 );
		
			 this.month =  new Array(
				jQFWlanguage.localize("January"),
				jQFWlanguage.localize("February"),
				jQFWlanguage.localize("March"),
				jQFWlanguage.localize("April"),
				jQFWlanguage.localize("May"),
				jQFWlanguage.localize("June"),
				jQFWlanguage.localize("July"),
				jQFWlanguage.localize("August"),
				jQFWlanguage.localize("September"),
				jQFWlanguage.localize("October"),
				jQFWlanguage.localize("November"),
				jQFWlanguage.localize("December")
			 );	
			 
			 //add the localize function as an ejs helper so we can use it the template files
			 EJS.Helpers.prototype.localize = function(translation){ return jQFWlanguage.localize(translation); };
			 this.localize = function(translation){ return jQFWlanguage.localize(translation); };
			 
			 //set the display type
			 this.$element.addClass('facebook-wall wall facebook-wall-clearfix')
			 if(this.options.display === 'timeline'){
				this.$element.removeClass('wall');	 
			 	this.$element.addClass('timeline');
			 }
			 if(this.options.display === 'single-column'){
				this.$element.removeClass('wall');	 
			 	this.$element.addClass('single-column');
			 }
			 
			 
			 //here's to the crazy guy in a cabin thats still using ie 7 or 8
			 var msVersion = navigator.userAgent.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/);
			 if(msVersion){
			 var msie = msVersion[0].split(' ')[0];
				 if(msie){ 
				 	if (parseFloat(msVersion[1]) < 8){
						//ie7
						this.$element.addClass('fbw-ie7')		
					}
					else if (parseFloat(msVersion[1]) < 9){
						//ie7
						this.$element.addClass('fbw-ie8')		
					}
					
				 }
			 }
			 
			 //add the loading spinner
			 this.$element.append('<div class="fbw-wall-loading fbw-big-loading " />');
			 
			 //add the facebook login button
			 if( this.options.facebookLoginButton.show ){
			 	var $wrapper = $('<div class="fbw-facebook-login-btn-wrapper">');
				    $wrapper.css({
						"text-align": this.options.facebookLoginButton.position
					});
				    $wrapper.append('<div class="fbw-facebook-login-btn">'+this.localize("Login to Facebook to Like and Comment")+'</div>')
				this.$element.append($wrapper);
			 	this.$fbBtn = $wrapper;
			 }
			 //add the columns
			 this.$element.append($('<div class="fbw-left-column" />'));
			 if(this.options.display != 'single-column'){
			 	this.$element.append($('<div class="fbw-right-column" />'));
			 }
			 
		   	 //get thefacebook data, and build the wall
			 this.loadFbData();
			 
			 /*EVENT BINDINGS----------------------------------------------------------------------------------------------------------------------------------*/
		     
			 /* @name:   Facebook Login Button click
			  * @author: lorenzogangi@gmail.com
			  * @brief:  Handle when user clicks the "Login to Facebook" button
			  */ 
			 this.$element.on('click.jQueryFacebookWall', '.fbw-facebook-login-btn', function( ev ){
				_this._fbLogin(); 
			 });
			 
			 
			 /* @name: lightbox event
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user click an element with the lightbox class usually an image, will pop a light box
			  */
			 this.$element.on('click.jQueryFacebookWall','.jfw-lightbox-link',function(ev){
				
				var content = "<div>lightbox content</div>";
				var $target = $(ev.currentTarget)
				
				//see if its a album gallery, if it is build the gallery
				if($target.hasClass('album-cover-photo-wrapper')){
					//get the album photos and comments from fb
					$target.append('<div class="fbw-loading positioned"></div>');
					var albumData = $target.data('albumData')
					//get the album photos and comments from fb if they havn't been retrieved yet
					if(albumData.photos==undefined){
						var albumDataUrl = "https://graph.facebook.com/v2.1/"+albumData.id+"/?access_token="+_this.app.appToken+
										   "&fields=photos.fields(name,source,created_time,comments.fields(created_time,from,message,like_count))&callback=?"
						$.getJSON(albumDataUrl,function(photoData){
							$.each(photoData.photos.data,function(){
								this.created_time = _this._mysqlTimeStampToDate(this.created_time);
								if(this.comments){
									$.each(this.comments.data,function(){
										this.created_time = _this._fbTimeAgo(this.created_time);
									})
								}
							})
							$.extend(albumData, photoData);
							$.extend(albumData, {
								facebookUser:_this.app.fbUserInfo,
								templatePath:_this.options.installDirectory
							});
							content = new  EJS({url: _this.options.installDirectory+'templates/photoGallery.ejs'}).render(albumData);
							$target.find('.fbw-loading').remove();
							_this._popLightBox(content);	
						});
					}else{
						$.extend(albumData, {
							templatePath:_this.options.installDirectory
						});
						content = new  EJS({url: _this.options.installDirectory+'templates/photoGallery.ejs'}).render(albumData);
						$target.find('.fbw-loading').remove();
						_this._popLightBox(content);	
					}
				}
				else if($target.hasClass('photo-cover-photo-wrapper')){
				 	
					$target.append('<div class="fbw-loading positioned"></div>');
					var photosData = _this.photosData
					$.extend(photosData,{
						startingIndex: $target.attr('data-index'),
						templatePath: _this.options.installDirectory		
					})
					content = new  EJS({url: _this.options.installDirectory+'templates/photoGallery.ejs'}).render(photosData);
					$target.find('.fbw-loading').remove();
					_this._popLightBox(content);
				} 
			 });
			 
			 /* @name: userInteractionLikeStory
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks a like link in one of the posts
			  */
			 this.$element.on('click.jQueryFacebookWall','.user-interaction-like',function(ev){
			 	 var $target = $(ev.target);
				 var objectId = $target.closest('.story').attr('data-id');
				 _this._userInteractionLike(objectId, $target);
			 });
			 
			 /* @name: userInteractionComment
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks comment link of a story, changes focus to the story's comment field
			  */
			 this.$element.on('click.jQueryFacebookWall','.user-interaction-comment',function(ev){
			 	var $target =  $(ev.target);
				var $commentInput = $target.closest('.story-content').find('.comment-write').focus();
			 });
			 
			/* @name: userInteractionLikeStory
			 * @author: lorenzo gangi lorenzogangi@gmail.com
			 * @desc: user clicks a like link in a post comment
			 */
			 this.$element.on('click.jQueryFacebookWall','.user-interaction-comment-like',function(ev){
				 var $target = $(ev.target);
				 var objectId = $(ev.target).closest('.comment-wrapper').attr('data-id');
				 _this._userInteractionLike(objectId, $target);
			 });
			 
			 /*@name: userInteractionPostComment
			 * @author: lorenzo gangi lorenzogangi@gmail.com
			 * @desc: user clicks the comment input in a story, if the click the enter key post the contents of the input
			 */
			 this.$element.on('keypress.jQueryFacebookWall','.comment-write',function(ev){
				 if(ev.which==13){
					$target = $(ev.target)
					var message = $target.val();
					var objectId = $target.closest('.story').attr('data-id');
					_this._userInteractionComment(objectId,message,$target); 
				 }
			 });
			 
			 /* @name: userViewMoreCommnents
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks the 'view more comments' link on a story
			  */
			 this.$element.on('click.jQueryFacebookWall','.comments-view-more', function(event){ 
			 	_this._showMoreComments( event, _this ); 
			 });
			 
			 /*LIGHT BOX EVENTS----------------------------------------------------------------------*/
			 
			 /* @name: lightbox  close event
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks close icon in a light box
			  */
			 this.$element.on('click.jQueryFacebookWall','.jfw-lightbox-close', this._closeLightBox);
			 
			 /* @name: userInteractionLightBoxPaginationControls
		      * @author: lorenzo gangi lorenzogangi@gmail.com
		      * @desc: user clicks left or right pagination control in the lightbox photo gallery
		      */
			 this.$element.on('click.jQueryFacebookWall','.photo-gallery-control-left',{increment:-1}, function(event){
				 _this._photoGalleryPaginate(event,_this);
			 });
			 
			 this.$element.on('click.jQueryFacebookWall','.photo-gallery-control-right',{increment:1}, function(event){
				 _this._photoGalleryPaginate(event,_this);
			 });
			 
			 /* @name: lightbox  close event
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks on the lightbox overlay (outside the ligthbox while its visible)
			  */
			  this.$element.on('click.jQueryFacebookWall','.jfw-lightbox-overlay',{increment:1}, this._closeLightBox);
			 
			 /* @name: lightbox  left column hover event
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user hovers over the left column of the lightbox
			  */
			  this.$element.on('mouseenter.jQueryFacebookWall mouseleave.jQueryFacebookWall', '.facebook-wall.jfw-lightbox .left-col', function (ev) { 
			 	var $controls = $(this).find('.photo-gallery-controls');
				if(ev.type=='mouseenter'){
					$controls.fadeIn();
				}else{
					$controls.fadeOut();	
				}
			  })
			 
			 /* @name: lightbox userInteractionPostComment
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks the comment input for a story in an open lightbox, if the click the enter key post the contents of the input
			  */
			  this.$element.on('keypress.jQueryFacebookWall','.facebook-wall.jfw-lightbox .comment-write',function(ev){
				 if(ev.which==13){
					$target = $(ev.target)
					var message = $target.val();
					var objectId = $target.closest('.photo-gallery-comments').find('.story-wrapper.show .story').attr('data-id');
					_this._userInteractionComment(objectId, message, $target, 'photoGallery'); 
				 }
			 });
			 
			 /* @name: photoUserInteractionLikeStory
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks a like link in one of the posts
			  */
			 this.$element.on('click.jQueryFacebookWall','.photo-user-interaction-like',function(ev){
			 	 $target = $(ev.target);
				 var objectId = $target.closest('.story').attr('data-id');
				 _this._userInteractionLike(objectId, $target);
			 });
			 
			 /* @name: photoUserInteractionComment
			  * @author: lorenzo gangi lorenzogangi@gmail.com
			  * @desc: user clicks comment link of a story in the lightbox, changes focus to the story's comment field
			  */
			 this.$element.on('click.jQueryFacebookWall','.photo-user-interaction-comment',function(ev){
				 $target =  $(ev.target);
			     $target.closest('.photo-gallery-comments').find('.comment-write').focus();
			 });
        },


		/*PRIVATE METHODS------------------------------------------------------------------------------------------------------------------*/
		 
		 /* @name: _addPhotosToWall() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: adds a photos section to the right hand column of the wall
		  */
		 _addPhotosToWall: function ( photosData ){
			 
			 var _this = this;
			 
			 if(this.options.debug){this._debug('_addPhotosToWall: adding photos', photosData);}
	
			 //get the column
			 if(this.options.display == 'single-column'){
				var column  = this.$element.find('.fbw-left-column');
			 }
			 else{
				var column  = this.$element.find('.fbw-right-column');
			 }
			 
			 $.extend(photosData,
					{
						 numColumns: this.options.photos.numColumns,
						 showAtStart:this.options.photos.showAtStart
					}
			 );
			 var photos = new EJS({url: this.options.installDirectory+'templates/photos.ejs'}).render(photosData);
			 column.append(photos);
			 
			 //displayAnimation	 
			 this._displayAnimation('photos');
			 
			 //update photos data
			 $.each(photosData.data,function(){
				this.created_time = _this._mysqlTimeStampToDate(this.created_time);
				if(this.comments){
					$.each(this.comments.data,function(){
						this.created_time = _this._fbTimeAgo(this.created_time);
					})
				}
			 })	
			 
			 //resize photos
			 photosArray =  $('.photo-cover-photo-wrapper');
			 for(var i=0, l=photosArray.length; i<l; i++){
				$image = $(photosArray[i]).find('.photo-cover-photo');			
				$image.load(function(){
					 _this._resizeImage($(this),$(this).parent().width(), $(this).parent().height()); 
				});
			 }	
			  
			 this.photosData ={
				 'photos':photosData,
				 facebookUser:this.app.fbUserInfo	 
			 };
		 },
		 
		 /*@name: _addAlbumnsToWall() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: adds a albums section to the right hand column of the wall
		  */
		 _addAlbumsToWall: function (albumsData){
			 var _this = this;
			 
			 if (this.options.albums.filterAlbums){
				 albumsData.data = $.grep(albumsData.data, function (a){
					 if (_this.options.albums.filterAlbums.indexOf(a.name)!=-1){
						return a; 
					 }
				 })
			 }
			 
			 if(this.options.debug){this._debug('_addAlbumnsToWall: adding albums', albumsData);}
	
			 //get the column
			 if(this.options.display == 'single-column'){
				var column  = this.$element.find('.fbw-left-column');
			 }
			 else{
				var column  = this.$element.find('.fbw-right-column');
			 }
			 
			 //remvoe empty albums
			 var l = albumsData.data.length;
			 for( var i=0; i<l; i++ ){
			     if( !albumsData.data[i].cover_photo ){
					albumsData.data.splice( i, 1 );
					l--; 
				 }	 
			 }
			 
			 var albums = new EJS({url: this.options.installDirectory+'templates/albums.ejs'}).render(albumsData);
			 
			 //attach albums to the dom
			 column.append(albums) 
			 
			 //displayAnimation	 
			 this._displayAnimation('albums');
			 
			 //attach album dat to albums, and resize if necessary
			 albumsArray =  $('.album-cover-photo-wrapper');
			 for(var i=0, l=albumsArray.length; i<l; i++){
				$(albumsArray[i]).data('albumData',albumsData.data[i]);
				$image = $(albumsArray[i]).find('.album-cover-photo');			
				$image.load(function(){
					 _this._resizeImage($(this),$(this).parent().width(), $(this).parent().height()); 
				});
			 }
		 },
		 
		 /* @name: _resizeImage() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: takes a jquery wrapped image element and adjusts its height and horizontally centers it relative to maxWidth and maxHeight
		  */
		 _resizeImage: function($image, $maxWidth, $maxHeight){
			 if ($image.height()<$maxHeight){
				$image.height($maxHeight);
				$image.css('width','auto');
				$leftMargin = ($image.width()-$maxWidth)/2;
				$image.css('margin-left',$leftMargin*-1);	 
					 
			 }
		 },
		 
		 /*@name: _addEventsToWall() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: adds a events section to the right hand column of the wall
		  */
		 _addEventsToWall: function(eventsData){
			 var _this = this;
			 
			 if(this.options.debug){this._debug('_eventsToWall: adding likes', eventsData);}
	
			//get the column
			 if(this.options.display == 'single-column'){
				var column  = this.$element.find('.fbw-left-column');
			 }
			 else{
				var column  = this.$element.find('.fbw-right-column');
			 }
	
			 $.each(eventsData.data,function(){
				this.start_time = _this._mysqlTimeStampToDate(this.start_time);
				if( this.end_time ){
					this.end_time = _this._mysqlTimeStampToDate(this.end_time);
				}				
				
			 })
		 		
			 eventsData.facebookUser =  this.options.facebookUser;
			 
			 $.extend( eventsData, {'showTicketLink': this.options.events.showTicketLink})
			 
			 var events = new EJS({url: this.options.installDirectory+'templates/events.ejs'}).render(eventsData);
			 column.append(events)
					 
			 //displayAnimation	 
			 this._displayAnimation('events');
		 },
		
		 /*@name: _addLikesToWall() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: adds a like section to the right hand column of the wall
		  */
		 _addLikesToWall: function(likesData){
			 if(this.options.debug){this._debug('_addLikesToWall: adding likes', likesData);}
			 $.extend(likesData,{useCoverPhotos:this.options.likes.useCoverPhotos});
			 
			 //get the column
			 if(this.options.display == 'single-column'){
				var column  = this.$element.find('.fbw-left-column');
			 }
			 else{
				var column  = this.$element.find('.fbw-right-column');
			 }
			 
			 //add a likes
			 var likes = new EJS({url: this.options.installDirectory+'templates/likes.ejs'}).render(likesData);
			 column.append(likes);
			 
			 this._displayAnimation('likes');
		 },
		 
		 /*@name: _buildFBWall() 
		  * @author: lorenzo gangi lorenzogangi@gmail.com
		  * @desc: builds the facebook wall html (uses ejs templateing)
		  */
		  _buildFbWall: function (feedData) { 
	
			//@debug
			if(this.options.debug){this._debug('_buildFbWall: feed data',feedData);}
			
			var $leftColumn = this.$element.find('.fbw-left-column');
			
			//get the right column
			if(this.options.display == 'single-column'){
				$rightColumn  = this.$element.find('.fbw-left-column');
			}
			else{
				$rightColumn  = this.$element.find('.fbw-right-column');
			}
			
			var _this = this;
			var i = 0;
			var colOffset = 0;
			var leftColHeight = 0;
			var rightColHeight = 0;
			//calculate the height of the right column
			$rightColumn.find('.story').each(
				function(){
					rightColHeight+=$(this).height();
				}
			);
			
		
			$.each(feedData.data,function(){
				if(_this.options.debug){console.log('_buildwall: feed data - post:'); console.log(_this);}
				var storyData = this;
				
				var comments = storyData.comments;
					
					//build the post link
					storyData.postLink = storyData.id.replace("_",'/posts/');
					
					//update the post data, time and photos
					storyData.created_time =  _this._fbTimeAgo(storyData.created_time);
					if(storyData.likes){ 
						storyData.likes.count =  _this._addCommas(storyData.likes.count);
					}
					if(storyData.message){
						storyData.message = _this._makeLinks(storyData.message);
					}
					if(_this.options.display === 'timeline'){
						//get the album size image, this may become dated and need to replaced by a graph call to the post object 
						if(storyData.picture!==undefined){
							storyData.picture = storyData.picture.substring(0, storyData.picture.length - 5)+'n.png';
						}
					}
					//update the number of comments in the story data to the total number of comments returned from fb
					//fb graph results can be inconsistent so the only way to assure the pagination controls are accurate is 
					//to manage them through the returned comments number not the comments count provided by fb
					//see https://developers.facebook.com/blog/post/478/
					if(storyData.comments){
						storyData.comments.count =  comments.data.length;
					}
					
					//check the story link
					if(storyData.link){
						//if the story link does not contain a :// protocal then prepend with http://facebook.com
						if( storyData.link.indexOf("//") === -1 ){
							storyData.link = "http://facebook.com"+storyData.link;	
						}
					}
					
					//make a post, and load the post template and dtaa 
					var storyHtml = new EJS({url: _this.options.installDirectory+'templates/story.ejs'}).render(storyData);
					
					//attach the post, so long as its not a shared story and it has a message
					//if(storyData.message){
					
					//@todo add filter posts by like count to options
					if(storyData.story && !storyData.message){storyData.message=storyData.story;}
					if(!storyData.likes){
						storyData.likes = {summary:{'total_count':0}};
					}
					
					if(storyData.message && (_this.options.likes.minLikes <= storyData.likes.summary.total_count )){
						
						//at this point we dont support shared stories, story.ejs would need and overhall and few more fields would need to be added to the feed request
						var $lastStory = '';
						if(_this.options.display == 'timeline'){
							if(leftColHeight < rightColHeight){
								$leftColumn.append(storyHtml);
								$lastStory = $leftColumn.find('.story').last();
								addPostComments(storyData);
								var width = $leftColumn.find('.story').last().find('.story-picture').width()
								leftColHeight += $leftColumn.find('.story').last().height()+width; //aproximation to account for height of image that hasnt loaded
								
								//check if css3 animation are turned on
								if(_this.options.displayAnimation){
									$lastStory.addClass('scale-left-nosize');
								}
							}
							else{
								$rightColumn.append(storyHtml);
								$lastStory = $rightColumn.find('.story').last();
								$lastStory.find('.timeline-pointer-left').removeClass('timeline-pointer-left').addClass('timeline-pointer-right');
								addPostComments(storyData);
								var width = $rightColumn.find('.story').last().find('.story-picture').width();
								rightColHeight += $lastStory.height()+width; //aproximation to account for height of image that hasnt loaded
								
								//check if css3 animation are turned on
								if(_this.options.displayAnimation){
									$lastStory.addClass('scale-right-nosize');
								}
							}
						}
						else{
							$leftColumn.append(storyHtml);
							$lastStory = $leftColumn.find('.story').last();
							addPostComments(storyData);
							if(_this.options.displayAnimation){
								$lastStory.addClass('scale-nosize');
							}
						}
						
						
							
					}//end shared story check
				
					//add comments
						function addPostComments(storyData){
							if(storyData.comments){
								if(_this.options.debug){_this._debug('_buildFbWall: adding Comments',comments);}
								//save the next page of comments url in the element
								$.each(comments.data,function(){
									this.created_time = _this._fbTimeAgo(this.created_time)
								})
								comments['showAtStart'] = _this.options.comments.showAtStart
								var commentsHtml = new EJS({url: _this.options.installDirectory+'templates/comments.ejs'}).render(comments);
							
								//update comment counts
								$commentStats = $lastStory.find('.comment-stats');
								//if the number of comments is less than the show at start value 
								$commentCountCurrent = $commentStats.find('.comment-count-current')
								if(storyData.comments.data.length < _this.options.comments.showAtStart){
									$commentCountCurrent.text(comments.data.length)
									$commentStats.find('.comments-view-more a').addClass('hide');
								}
								else{
									$commentCountCurrent.text(_this.options.comments.showAtStart)
								}
							
							}
							//attach the post
							var element = _this.$element.find('.story[data-id='+storyData.id+'] .comments')
								element.append(commentsHtml);
								
								//save the next page of comments url in the element
								if(storyData.comments && comments.paging.next){
									element.data('commentsNextPage',comments.paging.next)
								}
						}	
							
			});//end each
		}, 
	
		/**
		 * @brief  All the data has been retrieved from facebook, finish up putting the interface together.
		 * @author lorenzogangi@gmail.com
		 */
		_showWall: function(){
			
			var _this = this;
			var $leftColumn = this.$element.find('.fbw-left-column');
			
			//check if the user is signed into facebook, if not show them the sign in button
			if( _this.options.facebookLoginButton.show && this._fbAuthenticate()  ){	
			    _this.$fbBtn.hide();
			}
			
			//get the right column
			if(this.options.display == 'single-column'){
				$rightColumn  = this.$element.find('.fbw-left-column');
			}
			else{
				$rightColumn  = this.$element.find('.fbw-right-column');
			}
			
			$leftColumn.css('visibility','visible');
			$rightColumn.css('visibility','visible');
			
			//check if animation is turned on
			if(this.options.displayAnimation){
				
				var animationDelay = this.options.displayAnimationDelay;
				
				//make aray of stories that alternates from left to right.
				var $leftStories = this.$element.find(".fbw-left-column .story");
				var $rightStories = this.$element.find(".fbw-right-column .story");
				
				var array1 = $leftStories;
				var array2 = $rightStories;
				
				if ($leftStories.length < $rightStories.length){
					array1 = $rightStories;
					array2 = $leftStories;	
				}
				
				var stories = $.map(array1, function(v, i) { 
					if(array2[i]){
						return [v, array2[i]]; 	
					}
					else{
						return [v]; 
					}
				});
				
				//animate the stories
				for (var i=0,l=stories.length; i<l; i++){
					(function(i){
						var $story = $(stories[i]);
						setTimeout(function(){
							
							if(_this.options.display === "timeline"){
								if($story.hasClass("scale-left-nosize")){
									$story.addClass("scale-left-fullsize").removeClass("scale-left-nosize");
								}
								else{
									$story.addClass("scale-right-fullsize").removeClass("scale-left-nosize");
								}
							}
							else{
								$story.addClass("scale-fullsize").removeClass("scale-nosize");	
							}
							
						},animationDelay*i);
					})(i)
				}
			}
			
			$('.fbw-wall-loading').fadeOut();
		}, 
		
		/*@name displayAnimation0
		* @author lorenzo gangi lorenzogangi@gmail.com
		* @desc   Handles applying the animation classes to events, photos, alubms, and likes
		* @param  widget {string} Name of the widget to handle, 'event', 'photos' etc
		*/
		_displayAnimation: function(widget) {
			if(this.options.displayAnimation){
				 var $widget = this.$element.find("."+widget)
				 if(this.options.display === "timeline"){
					$widget.addClass("scale-right-nosize");	 
				 }
				 else if (this.options.display === "wall" || this.options.display === "single-column" ){
					$widget.addClass("scale-nosize");	 
				 }	 
			}	
		},
		
		/*@name: this._debug()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: debug wrapper funtion so I dont have to put console logs all over my code, can toggle in options
		*/
		_debug: function(message, data, error){
			if(error!=undefined){
				console.log('jQuery Facebook Wall ERROR-------');
			}
			else{
				console.log('DEBUG MESSAGE--------------------');
			}
				console.log(message);
				console.log(data)
				console.log('---------------------------------');
		},
		
		/*@name: _getFbData()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: gets all the data from the facebook graph based on pulgin config
		*/
		_getFbData: function(){
		
			var _this = this;
			var deferreds = [];
			var callbacks = [null,null,null,null,null,null];
			var index = []; 
			
			//get the feed target user info
			
			var userInfoUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/?access_token="+this.app.appToken+"&callback=?";
			deferreds[0] = $.getJSON(userInfoUrl);
			callbacks[0] = fbUserInfo;
			index[0] = 'fbUserInfo';
			
			//add likes
			var howmany = 1;
			if(this.options.likes.show){
				var likeUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/likes/?access_token="+this.app.appToken+
							  "&fields=picture, category,id,cover,name,website"+
							  "&limit="+this.options.likes.limit+"&callback=?";
				deferreds.push($.getJSON(likeUrl));
				
				if(callbacks[this.options.likes.order]){ howmany = 0; }
				callbacks.splice(this.options.likes.order, howmany, likes);
				index.push('likes');
			}
			
			//add photos
			if(this.options.photos.show){
				var photoUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/photos/?access_token="+this.app.appToken+
							  "&fields=name,comments,created_time,picture,source,album"+
							  "&limit="+this.options.photos.limit+
							  "&type="+this.options.photos.type+"&callback=?";
				deferreds.push($.getJSON(photoUrl));
				if(callbacks[this.options.photos.order]){ howmany = 0; }
				callbacks.splice(this.options.photos.order, howmany, photos);
				index.push('photos');
			}
			
			//add albums
			if(this.options.albums.show){
				var albumUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/albums/?access_token="+this.app.appToken+
							  "&fields=id,name,count,cover_photo"+
							  "&limit="+this.options.albums.limit+"&callback=?";
				deferreds.push($.getJSON(albumUrl));
				if(callbacks[this.options.albums.order]){ howmany = 0; }
				callbacks.splice(this.options.albums.order, howmany, albums);
				index.push('albums');
			}
			
			//add events
			//showPastEvent
			if(this.options.events.show){
				var ticket_uri = '';
				var showPastEvents = (this.options.events.showPastEvents!==false)?"&since="+this.options.events.showPastEvents : "";
				if(this.options.events.showTicketLink){
					ticket_uri = 'ticket_uri,';
				}
				var eventUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/events/?access_token="+this.app.appToken+
							  "&fields="+ticket_uri+"start_time,end_time,name,description,place,picture,owner"+
							  "&limit="+this.options.events.limit+showPastEvents+"&callback=?";
				deferreds.push($.getJSON(eventUrl));
				if(callbacks[this.options.events.order]){ howmany = 0; }
				callbacks.splice(this.options.events.order, howmany, events);
				index.push('events');
			}
			
			//add the feed
			if(this.options.posts.show){
				var feedUrl = "https://graph.facebook.com/v2.4/"+this.options.facebookUser+"/"+this.options.posts.feedType+"/?access_token="+this.app.appToken+
							  "&fields=id,created_time,comments.limit("+this.options.comments.limit+").fields(id,created_time,like_count,from,message),status_type,picture, full_picture, source, properties, name, caption, description, link, from,message,story,likes.summary(true),object_id,shares"+
							  "&limit="+this.options.posts.limit+"&callback=?";
				deferreds.push($.getJSON(feedUrl));
				if(callbacks[this.options.posts.order]){ howmany = 0; }
				callbacks.splice(this.options.posts.order, howmany, feed);
				index.push('feed');
			}
			
			//show the wall after all the other defereds have returned
			callbacks.push(function(){_this._showWall();})
			
			
			
			//go get all the data from fb
			$.when.apply($,deferreds).done(callbacks).fail(function(data){
				//@debug
				if(this.options.debug){this._debug('_getFbData: failed to retrieve facebook data',data);}
			});	
			
			//fb data callbacks
			
			//SAVE FB User Data
			function fbUserInfo(dataUser){
				_this.app.fbUserInfo=arguments[0][0];
			}
			
			//ADD FEED
			function feed(data){
				//find the index of feed data
				var i = $.inArray('feed',index);
				//check to see if we got an error back or if there is data, if there add it to the wall
				_this._validateRetrievedData ('feed', arguments[i][0], _this._buildFbWall);
			}
			
			//ADD LIKES
			function likes(datalikes){
				//find the index of likes data
				var i = $.inArray('likes',index);
				//check for an access token error
				if(datalikes[0].error){
					alert('Looks like something is wrong with your Access Token: '+datalikes[0].error.message);
				}
				else{
					//check to see if we got an error back or if there is data, if there add it to the wall
					_this._validateRetrievedData ("likes", arguments[i][0], _this._addLikesToWall);
				}
			}
			
			//ADD ALBUMS
			function albums(dataalbums){
				//find the index of likes data
				var i = $.inArray('albums',index);
				//check to see if we got an error back or if there is data, if there add it to the wall
				_this._validateRetrievedData ('albums', arguments[i][0], _this._addAlbumsToWall);	
			}
			
			//ADD PHOTOS
			function photos(dataphotos){
				//find the index of likes data
				var i = $.inArray('photos',index);
				//check to see if we got an error back or if there is data, if there add it to the wall
				_this._validateRetrievedData ('photos', arguments[i][0], _this._addPhotosToWall);
			}
			
			//ADD EVENTS
			function events(dataevents){
				//find the index of likes data
				var i = $.inArray('events',index);
				//check to see if we got an error back or if there is data, if there add it to the wall
				_this._validateRetrievedData ("events", arguments[i][0], _this._addEventsToWall);
			}
		},
		
		/*@name: _validateRetrievedData()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc:  Checks data returned from Facebook to see if there was an error
		* @param: {string} dataType The type of data that was returned from Facebook ie likes, events, photos etc.
		* @param: {object} returnedData     Data object returned from facebook.
		*/
		_validateRetrievedData: function (dataType, returnedData, dataLoadFunction){
			//check to see if we got an error back or if there is data
			if(returnedData.data){
				dataLoadFunction.call(this,returnedData);
			}
			else if (returnedData.error){
				if(this.options.debug){
					console.log('_getFbData: '+dataType+' data retrieval error ->'+returnedData.error.message);
					
					alert( dataType+' data retrieval error, here is what facebook has to say about your request: ->'+returnedData.error.message);
	
					if(dataType === 'albums'){
						alert('There was problem retrieving data from facebook, this may be because you facebook account is not a page. Albums can only be retrieved for facebook Pages.')
					}
				}	
			}
			else {
				if(this.options.debug){ 
					console.log('_getFbData: '+dataType+' data retrieval unknow error');
				}	
			}
		},
		
		/*@name: _makeLinks()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: pareses incoming data and looks for http://, if it finds a 'foundlink' link it wraps it like so <a href='foundlink'>foundlink</a>
		* @params: data, string of data to be parsed
		*/
		_makeLinks: function(data){
			var exp = /(\b(http?|https):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
			return data.replace(exp,"<a href='$1'>$1</a>"); 	
		},
		
		/*@name: _photoGalleryPaginate()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: paginates through gallery images dependent on the increment value passed in
		* @params: ev, event used to the increment value and the target
		*/
		_photoGalleryPaginate: function(ev, _this){
			var increment = ev.data.increment;
			var $target = $(ev.currentTarget);
			
			var images = $target.parent().prev().find('.photo-gallery-photo');
			var imagesData = $target.closest('.photo-gallery').find('.story-wrapper')
			
			for(var i=0, l=images.length; i<l; i++){
				if($(images[i]).hasClass('show')){
					//you found the current image so hide it
					$(images[i]).removeClass('show').addClass('hide');	
					$(imagesData[i]).removeClass('show').addClass('hide');	
					if(images[i+increment]){
						//show the next or previous images dependant on increment value
						$(images[i+increment]).removeClass('hide').addClass('show');
						$(imagesData[i+increment]).removeClass('hide').addClass('show');
						_this._updateImageDimension($(images[i+increment]),$target.parent().prev());
						return;
					}else{
						//your at the first or the last image in the array
						if (increment==1){
							//your at the end so show the first image in the array
							$(images[0]).removeClass('hide').addClass('show');
							$(imagesData[0]).removeClass('hide').addClass('show');
							_this._updateImageDimension($(images[0]),$target.parent().prev());
						}else{
							//youra that the begining so show the last element of the array
							$(images[images.length-1]).removeClass('hide').addClass('show');
							$(imagesData[images.length-1]).removeClass('hide').addClass('show');
							_this._updateImageDimension($(images[images.length-1]),$target.parent().prev());	
						}	
					}	
				}	
			}
			
			//set the shown image id on the comment input
			var $imageCommentInput  = this.$element.find('.photo-gallery-comments .comment-write');
			var $currentImageData = this.$element.find('.photo-gallery-comments .show .story');
			$imageCommentInput.attr('data-story-link', $currentImageData.attr('data-story-link'));
			
		},//end _photoGalleryPaginate
		
		
		/*@name: _photoGalleryPaginate()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: paginates through gallery images dependent on the increment value passed in
		* @params: ev, event used to the increment value and the target
		*/
		_updateImageDimension: function($image, $photoGallery){	
				//vertical align image
				
				var imageHeight = $image.height();
				var photoGalleryHeight = $photoGallery.parent().height();
				var imageWidth = $image.width();
				var photoGalleryWidth = $photoGallery.parent().width()
				
				if (imageWidth>photoGalleryWidth){
					$image.width(photoGalleryWidth);
				}
				else if (imageHeight>photoGalleryHeight){
					$image.height(photoGalleryHeight);
				}
				/*
				if(ie7){
					if ($image.height()>$photoGallery.height()){
						$
						//var topMargin = ($photoGallery.height()-$image.height())/2;
						//subtract 30 to compensate for the height of the photo info on the bottom
						//$image.css('margin-top',topMargin-15)	
					}
				}
				*/
				//update the ablum title
				albumName = '';	
				var albumName = $image.closest('.photo-gallery').attr('data-album-name');
				if(!albumName){
					var imageIndex = $image.attr('data-id');
					if(this.photosData.photos.data[imageIndex].album){
						albumName = this.photosData.photos.data[imageIndex].album.name
					}
				}
				//compare current album name and see if it needs to be replaced
				var currentAlbumName = $image.closest('.left-col').find('.photo-gallery-album')
				if(currentAlbumName.text() != albumName){
					currentAlbumName.text(albumName)
				}
		},
		
		/*@name: _buildStoryLightboxContent()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: In the event that the facebook app has not been granted publish_actions permissions, the plugin will
		*        pop a light box containing an iframe with the facebook story in it so the user can like and comment.
		* @params: $story {object} jQuery reference to the story element
		*/
		_buildStoryLightboxContent: function($story){
			
			_this = this;
			
			//@todo
			//if (confirm(localize("Post Fail Message")) == true) {
				//get the story link
				var storyLink = $story.attr('data-story-link');
				 
				if (this.options.likeAndCommentBackup == "popup"){
					//open the fb data in a popup	
					window.open(storyLink, "Like and Comment", width='750', height='750');
				}
				else if(this.options.likeAndCommentBackup == "tab"){
					//open the fb data in a tab
					window.open(storyLink, "Like and Comment");
				}
			//} 
			//else {
			//}
		},
		
		/*@name: _poplightbox()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: pops a light box
		* @params: data - {} of data, content - string of html 
		* @params: _this {object} reference to the plugin
		*/
		_popLightBox: function(content){	
			
			var _this = this;
			
			//add the box to the body
			var lightbox = new EJS({url: this.options.installDirectory+'templates/lightbox.ejs'}).render({content: content});
			var $lightbox = $(lightbox);
			$lightbox.find('.jfw-lightbox-content').append(content);
			var $overlay = $("<div class='facebook-wall jfw-lightbox-overlay'></div>")
			$overlay.height($(document).height());
			
			this.$element.append($overlay).append(lightbox)
			$lightbox.find('.jfw-lightbox-content').append(content);
			
			$overlay.next().fadeIn(function(){
				//refind the lightbox now that its in the dom 
				$lightbox = $('.facebook-wall .jfw-lightbox');	
				
				//add the height to the light box for ie7
				$lightbox.css('height',$lightbox.height());
				
				//vertical align shown images in photo gallery if it exsists
				//@todo might not be the most effcient way to do this should revisit.
				var $photos = $lightbox.find('.jfw-lightbox-content .photo-gallery-photo.show');
				if($photos.length) {
					_this._updateImageDimension($photos, $lightbox.find('.jfw-lightbox-content .photo-gallery-photos'));
				}
			});
		},
		
		/*@name: _closeLightbox()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: pops a light box
		* @params: data - {} of data, content - string of html 
		*/
		_closeLightBox: function(){
			$lightbox = $('.jfw-lightbox')
			$lightbox.fadeOut(function(){	
				$lightbox.remove();
				$('.jfw-lightbox-overlay').remove();
			})
		},
		
		/*@name: _showMoreComments()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: reveils next increment of hidden comments
		*/
		_showMoreComments: function(ev, _this){
			var $target = $(ev.target);
			var $comments = $target.closest('.comment-wrapper').prev();
			var $commentCount = $target.closest('.comment-wrapper').find('.comment-count-current');
			var showMoreNum = parseInt(_this.options.comments.showMoreNum);
			
			//only showing the inital comments reveal the rest of the already loaded comments	
			var temp = $comments.find('.comment-wrapper.hide:lt('+showMoreNum+')');
			
			temp.removeClass('hide');
			var count = $commentCount.text()*1;
			$commentCount.text(count+=showMoreNum);	
			if(temp.length < showMoreNum ){
				$target.closest('.comment-wrapper').addClass('hide');
			}
		},
		
		/*@name: _userInteractionLike()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: posts a like to facebook and adjusts wall interface accordingly
		* @params: objectId - id of the facebook object thats getting liked, $target jQuery wrapped dom element of link
		*/
		_userInteractionLike: function(objectId, $target){
			
			//check to see if the user is logged in
			var _this = this;
			var loggedIn =  this._fbAuthenticate();
			
			if(loggedIn){
				if(this.options.debug){console.log('_userInteractionLike: posting a like');}
				var liked = $target.hasClass('liked')
				var issueType = 'post';
				var linkText = jQFWlanguage.localize('Unlike');
				var i = 1;
				if(liked){ 
					issueType = 'delete';
					linkText = 'Like';
					i = -1; 
				}
				FB.api('/'+objectId+'/likes', issueType, function(response) {
				  if (!response || response.error) {
					if(_this.options.debug){console.log('_userInteractionLike: ERROR posting like, response error:'); console.log(response.error);}
					if(_this.options.likeAndCommentBackup){
					    _this._buildStoryLightboxContent($target.closest('.story'));
				  	}
				  } else {
						if(_this.options.debug){console.log('_userInteractionLike: like posted, response:'); console.log(response);}
						//update the numbers and the message
						if(!liked){
							$target.addClass('liked');
						}
						if($target.hasClass('user-interaction-comment-like')){
							//comment like
							$target.text(linkText)
							var likeCount = $target.parent().find('.comment-like-count')
							likeCount.text(_addCommas((likeCount.text().replace(',','')*1)+i));
						}
						else{
							//post like
							$target.text(linkText);
							$storyContent = $target.closest('.story-content')
							var likeCount = $storyContent.find('.story-comment-count')
							likeCount.text(_this._addCommas((likeCount.text().replace(',','')*1)+i));
							if(!liked){
								if(likeCount.text()==1){
									$storyContent.find('.story-stats .you-like').text('You ');
								}
								$storyContent.find('.story-stats').removeClass('hide');
								likeCount.prev().show()
							}
							else{
								likeCount.prev().hide()
							}
						}
				  }
				});
				
			}	
		},
		
		/*@name: _userInteractionComment()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: posts a like to facebook and adjusts wall interface accordingly
		* @params: objectId - id of the facebook object thats getting liked, 
		*          message - string of message content
		*          $target jQuery wrapped dom element of link
		*    	   customCommentsWrapper - string flag used to differentiate wether or not the comment is on a photoGallery itemm or a wall post
		*/
		_userInteractionComment: function(objectId, message, $target, customCommentsWrapper){
			
			var _this = this;
			var loggedIn =  this._fbAuthenticate();
			
			if(loggedIn){
				//@debug
				if(_this.options.debug){console.log('_userInteractionCommnet: posting a comment');}
	
				//post the comment
				$target.fadeOut();
				$target.parent().append('<div class="fbw-loading" />')	
				FB.api('/'+objectId+'/comments', 'post',{'message':message} ,function(response) {
				  if (!response || response.error) {
					if(_this.options.debug){console.log('_userInteractionCommnet: ERROR posting comment, response error:'); console.log(response.error);}
					if(_this.options.likeAndCommentBackup){
					   var $story = ($target.attr('data-story-link'))? $target : $target.closest('.story');
					    _this._buildStoryLightboxContent($story);
				  	}
				  } else {
					//@debug
					if(_this.options.debug){console.log('_userInteractionCommnet: comment posted, response:'); console.log(response);}
					
					//insert the comment
					comment = {
						showAtStart:"All",
						data:[{
							from:{
								id: _this.currentUser.id,
								name: _this.currentUser.name
							},
							message: message,
							id: response.id
						}]	
					}
					var commentsHtml = new EJS({url: _this.options.installDirectory+'templates/comments.ejs'}).render(comment);
					$target.closest('.story-content').find('.story-stats').removeClass('hide')
					if(customCommentsWrapper == 'photoGallery'){
						$target.closest('.photo-gallery-comments').find('.story-wrapper.show .photo-info').after(commentsHtml);
					}
					else{
						$target.closest('.story-comments').find('.comments').prepend(commentsHtml);
						//update comment count
						var totalComments = $target.closest('.story-comments').find('.comment-count-current').next();
						totalComments.text((totalComments.text()*1)+1);
					}
					//clear the input value
					$target.val('');
				  }
				  $target.parent().find('.fbw-loading').remove();
				  $target.fadeIn();
				});
			}
		},
		

		
		/*FACEBOOK METHODS-----------------------------------------------------------------------------------------------------------------*/
		
		/*@name: _fbAuthenticate()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: checks to see if a user is logged in (has an access token) if they dont it redirects them to fb to log in
		* @init: {boolean} init Flag to check if the authentication call is coming from the init funciton we dont want it
		*                       to ask for a login if they are not logged in on init we only ask for that if they try to like of comment
		*/
		_fbAuthenticate: function(init){
			var _this = this;
			
			if(!this.loggedIn){
				FB.getLoginStatus(function(response) {
					if (response.status === 'connected') {
					  // connected
					  if(_this.options.debug){console.log('_fbAuthenticate: user authenticated:'); console.log(response);}
					  _this.loggedIn =  true;
					  _this._fbGetUserData();
					  //hide the fb login button
					  if( _this.options.facebookLoginButton.show ){
					      _this.$fbBtn.hide();
					  }
					} 
					else if (response.status === 'not_authorized' && !init) {
					  // not_authorized
					  _this._fbLogin();
					} 
					else if ( !init ) {
					  // not_logged_in
					  _this._fbLogin();
					}
				});
				return false;
			}
			else{
				return true;	
			}	
		},
		
		/*@name: _fbInitSDK()
		* @author: modified by lorenzo gangi lorenzogangi@gmail.com
		* @desc: inits facebook js library
		*/
		_fbInitSDK: function(){
			 var _this = this;
			 var fbOptions = {
				  appId      : this.options.appId*1, // App ID
				  channelUrl : '//'+this.options.domain, // Channel File
				  status     : true, // check login status
				  cookie     : true, // enable cookies to allow the server to access the session
				  xfbml      : true, // parse XFBML
				  version    : 'v2.1'
				}
			 
			 if( typeof FB!== "undefined"){
				FB._initialized = false;
				FB.init(fbOptions);
				return
			 }
			
			 // Additional JS functions here
			  window.fbAsyncInit = function() {
				FB.init(fbOptions);
				_this._fbAuthenticate(true);
			  };
			
			  // Load the SDK Asynchronously
			  (function(d){
				 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
				 if (d.getElementById(id)) {return;}
				 js = d.createElement('script'); js.id = id; js.async = true;
				 js.src = "//connect.facebook.net/en_US/sdk.js";
				 ref.parentNode.insertBefore(js, ref);
			  }(document));	
			  
			  
		},
	
		/*@name: _fbLogin()
		* @author: modified by lorenzo gangi lorenzogangi@gmail.com
		* @desc: creates a facebook login popup dialog
		*/
		_fbLogin: function() {
			var _this = this;
			FB.login(function(response) {
				if (response.authResponse) {
					// connected
					if(_this.options.debug){
						console.log('_fbLogin: user authenticated:'); console.log(response);
					}
					if (response.status == 'connected'){
						
						_this.loggedIn = true;
						
						//get the users data 
						_this._fbGetUserData();
					}
					//hide the fb login button
					if( _this.options.facebookLoginButton.show ){
						_this.$fbBtn.hide();
					}
				} 
			},{
				//scope: 'publish_actions, publish_stream, user_likes',
				scope: 'publish_actions',
				return_scopes: true
			});
		},
	    
		
		
		/*@name: _fbGetUserData()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: gets an authenticated users facebook id and name
		*/
		_fbGetUserData: function() {
			var _this = this
			FB.api('/me', function(response) {
				if(_this.options.debug){console.log('_fbGetUserData: retrieved user data:'); console.log(response);}
				_this.currentUser.id = response.id
				_this.currentUser.name = response.name
			});
		},
		
		
		/*@name: _fbTimeAgo()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: transforms iso date to facebook style 'time ago' date
		* @param {string} time, javascript style date string ie 2014-09-02T18:26:40+0000 see http://tools.ietf.org/html/rfc2822#page-14
		*/
		_fbTimeAgo: function(time){
			//adjust the iso time stamp for safari
			if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
				time = time.replace("+0000", "Z");
			}
			
			//determine the day differencce between today and the incoming date
			var date = new Date(time),
				diff = (((new Date()).getTime() - date.getTime()) / 1000),
				day_diff = Math.floor(diff / 86400);
			
			//check to make sure the day differnce is legit		
			if ( isNaN(day_diff) || day_diff < 0  )
				return;
					
			var timeAgoString = "";
			if(day_diff == 0) {
				//less than a day ago.
				if( diff < 60 )           timeAgoString = jQFWlanguage.localize("just now");
				else if ( diff < 120 )    timeAgoString = jQFWlanguage.localize("1 minute ago");
				else if ( diff < 3600 )   timeAgoString = Math.floor( diff / 60 ) + jQFWlanguage.localize(" minutes ago");
				else if ( diff < 7200 )   timeAgoString = jQFWlanguage.localize("1 hour ago");
				else if ( diff < 86400 )  timeAgoString = Math.floor( diff / 3600 ) + jQFWlanguage.localize(" hours ago");
			}
			else {
				//more than a day ago
				if ( day_diff == 1 )      timeAgoString = jQFWlanguage.localize("Yesterday");
				else if ( day_diff < 7 )  timeAgoString = day_diff + jQFWlanguage.localize(" days ago");
				else if ( day_diff < 31 ) timeAgoString = Math.ceil( day_diff / 7 ) + jQFWlanguage.localize(" weeks ago");
				else  timeAgoString  = this.month[date.getMonth()]+" "+date.getDate();
			}
			     
		
			return timeAgoString;
		},
		
		/*@name: _addCommas()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: adds commas to number
		*/
		_addCommas: function(nStr){
		  nStr += '';
		  x = nStr.split('.');
		  x1 = x[0];
		  x2 = x.length > 1 ? '.' + x[1] : '';
		  var rgx = /(\d+)(\d{3})/;
		  while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		  }
		  return x1 + x2;
		},
		
		/*@name: _mysqlTimeStampToDate()
		* @author: lorenzo gangi lorenzogangi@gmail.com
		* @desc: transforms mysql style date string to 'Sunday January 1 2013'
		*/
		_mysqlTimeStampToDate: function(stamp) {
		  
		   var temp =  new Date(stamp);
			
			if(!temp.getMonth()){
				//The date conversion failed, Safari fix
				//remove the T and timezone stuff from the date stamp
				stamp = stamp.split(/[-T.]/);
				var temp =  new Date(stamp[0]+"/"+stamp[1]+"/"+stamp[2]+" "+stamp[3]); 
			}
			
		
			var longDay = this.weekday[temp.getDay()];
	
			
			var longMonth = this.month[temp.getMonth()];
			
			//format temp
			var day = temp.getDate();
			var month = temp.getMonth();
			var year = temp.getFullYear();
			return longDay+" "+longMonth+" "+day+" "+year;
		
		},	
		
		/*PUBLIC FUNCTIONS-------------------------------------------------------------------------------------------------------------------*/
		
		/**
		 *@name: method - loadFbData()
		 *@author: lorenzo gangi lorenzogangi@gmail.com
		 *@desc: gets the facebook feed data json
		 */
		 
		 loadFbData : function( ) { 
		 	
			//get the app token
			if(!this.app.appToken){
				//if there isnt a token saved in the plugin yet
				$.getJSON(this.options.installDirectory+'fb_app_token.html', $.proxy(function(data){
					this.app.appToken = data.appToken;
					this._getFbData();
				},this));	
			}
			else{
				this._getFbData();
			}
		 },
		  /* @name: method-destroy()
		  * @author: lorenzo gangi lorenzo@ironlasso.com
		  * @desc: removes the plugin from the dom and cleans up all its data and bindings
		  */
		 destroy : function( ) {
			
			 var data = this.$element.data('plugin_jQueryFacebookWall');
			 // Namespacing FTW
			 this.$element.unbind();
			 this.$element.removeData('plugin_jQueryFacebookWall');
			 this.$element.children().remove();
			 this.$element.removeClass('facebook-wall-clearfix timeline');
		 },

        yourOtherFunction: function(el, options) {
            // some logic
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                new Plugin( this, options ));
            }
        });
    };

})( jQuery, window, document );