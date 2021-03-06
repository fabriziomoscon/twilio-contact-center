app.controller('ChatController', function ($scope, $rootScope, $http, $sce, $compile) {

  $scope.message = null;
  $scope.channel;
  $scope.messages = [];
  $scope.session = { token: null, identity: null, isInitialized: false, isLoading: false };
  
  $scope.$on('DestroyChat', function(event) { 

    console.log('DestroyChat event received');
    
    $scope.message = null;
    $scope.channel.leave();
    $scope.messages = [];
    $scope.session.isInitialized = false;

  });

  $scope.$on('InitializeChat', function(event, data) { 

    console.log('InitializeChat event received');
    console.log(data);

    /* clean up  */
    $scope.message = null;
    $scope.channel = null
    $scope.messages = []
    $scope.session = { token: null, identity: null, isInitialized: false, isLoading: false };

    $scope.session.token = data.token;
    $scope.session.identity = data.identity;
        
  });      

  $scope.$on('ActivateChat', function(event, data) { 

    console.log('ActivateChat event received');
    console.log(data);

    $scope.session.channelSid = data.channelSid;

    $scope.session.isLoading = true;
    $scope.setupClient($scope.session.channelSid);

  });

  $scope.setupClient = function(channelSid){

    console.log('setup channel: ' + channelSid);
    accessManager = new Twilio.AccessManager($scope.session.token); 

    /**
     * you'll want to be sure to listen to the tokenExpired event either update 
     * the token via accessManager.updateToken(<token>) or let your page tell the user
     * the chat is not active anymore 
    **/
    accessManager.on('tokenExpired', function(){
      console.error('live chat token expired')
    }); 

    accessManager.on('error', function(){
      console.error('An error occurred')
    });   

    messagingClient = new Twilio.IPMessaging.Client(accessManager);

    var promise = messagingClient.getChannelBySid(channelSid);

    promise.then(function(channel) {
      console.log('channel is: ' + channel.uniqueName);
      $scope.setupChannel(channel);
    }, function(reason) {
      /* client could not access the channel */
      console.error(reason)
    });

  }

  $scope.setupChannel = function(channel){

    channel.join().then(function(member) {

      /* first we read the history of this channel, afterwards we join */
      channel.getMessages().then(function(messages) {
        for (i = 0; i < messages.length; i++) {
          var message = messages[i];
          $scope.addMessage(message);
        }
        console.log('Total Messages in Channel:' + messages.length);

        $scope.messages.push({
          body: 'You are now connected to the customer',
          author: 'System'
        });

         /* use now joined the channel, display canvas */
        $scope.session.isInitialized = true;
        $scope.session.isLoading = false;

        $scope.$apply();

      });

    });

    channel.on('messageAdded', function(message) {

      $scope.addMessage(message);

    });

    channel.on('memberJoined', function(member) {

      $scope.messages.push({
          body: member.identity + ' has joined the channel.',
          author: 'System'
        });
        $scope.$apply();

    });

    channel.on('memberLeft', function(member) {

       $scope.messages.push({
          body: member.identity + ' has left the channel.',
          author: 'System'
        });
        $scope.$apply();

    });

    channel.on('typingStarted', function(member) {
       console.log(member.identity + ' started typing');
       $scope.typingNotification = member.identity + ' is typing ...';
       $scope.$apply();
    });

    channel.on('typingEnded', function(member) {
      console.log(member.identity + ' stopped typing');
      $scope.typingNotification = '';
      $scope.$apply();
    });

    $scope.channel = channel;

  }

  /* if the message input changes the user is typing */
  $scope.$watch('message', function(newValue, oldValue) {
    if($scope.channel){
      $scope.channel.typing();
    }    
  });

  $scope.send = function(){
    $scope.channel.sendMessage($scope.message)
    $scope.message = '';
  }

  $scope.callInlineNumber = function(phone){
    console.log('call inline number ' + phone)
    $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phone });
  }

  $scope.addMessage = function(message){

    var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

    var m = message.body;

    if (pattern.test(message.body) == true) {
      var m = message.body.replace(pattern, "<p>$1<span class=\"chat-inline-number\" ng-click=\"callInlineNumber('$2')\">$2</span>$3</p>");
    }  

    $scope.messages.push({body: m, author: message.author, timestamp: message.timestamp});
    $scope.$apply();

  }

});

/* this is a demo, please don't do that in production */
app.filter('unsafe', function($sce) { return $sce.trustAsHtml; });

app.directive('dynamic', function ($compile) {
  return {
    restrict: 'A',
    replace: true,
    link: function (scope, ele, attrs) {
      scope.$watch(attrs.dynamic, function(html) {
        ele.html(html);
        $compile(ele.contents())(scope);
      });
    }
  };
});

app.filter('timeChat', function() {

  return function(value) {
    return moment(value).format('LTS')
  }

});

