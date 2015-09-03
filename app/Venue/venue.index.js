'use strict';

var React = require('react-native');
//var venue = require('./venueMock');
var Button = require('react-native-button');
var moment = require('moment');
moment().format();
var Display = require('react-native-device-display');
var KeyboardEvents = require('react-native-keyboardevents');
var KeyboardEventEmitter = KeyboardEvents.Emitter;
var {
  SliderIOS,
  Text,
  StyleSheet,
  View,
  ListView,
  TextInput
  } = React;

var config = require('../config');

var RefreshableListView = require('react-native-refreshable-listview');
var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

var VenueTab = React.createClass({
  getInitialState() {
    KeyboardEventEmitter.on(KeyboardEvents.KeyboardDidShowEvent, (frames) => {
      this.setState({keyboardSpace: frames.end.height});
    });
    KeyboardEventEmitter.on(KeyboardEvents.KeyboardWillHideEvent, (frames) => {
      this.setState({keyboardSpace: 0});
    });
    return {
      voteValue: 0,
      venue: this.props.venue,
      overallRating: 0,
      dataSource: ds.cloneWithRows(this.props.venue.comments),
      keyboardSpace: 0
    };
  },

  updateKeyboardSpace(frames) {
    this.setState({keyboardSpace: frames.end.height});
  },

  resetKeyboardSpace() {
    this.setState({keyboardSpace: 0});
  },

  componentDidMount: function() {
    //this.setState({venue: this.props.venue});
    //this.setState({dataSource: ds.cloneWithRows(this.props.venue.comments)})
    KeyboardEventEmitter.on(KeyboardEvents.KeyboardDidShowEvent, this.updateKeyboardSpace);
    KeyboardEventEmitter.on(KeyboardEvents.KeyboardWillHideEvent, this.resetKeyboardSpace);
  },

  reloadComments() {
  //  //return ArticleStore.reload() // returns a Promise of reload completion
    console.log(this.state.venue);

    console.log('device height:     ', Display.height);
    var route = config.serverURL + '/api/venues/' + this.state.venue.id;
    fetch(route)
      .then(response => response.json())
      .then(function(res) {
        for (var i = 0; i < res.comments.length; i++) {
          res.comments[i].datetime = moment(res.comments[i].datetime).fromNow();
        }
        return res;
      })
      .then(json => this.setState({venue: json, dataSource: ds.cloneWithRows(json.comments)}))
  },

  calculateDistance: function(current, venue) {
    Number.prototype.toRadians = function () { return this * Math.PI / 180; };
    var lon1 = current.longitude;
    var lon2 = venue.longitude;

    var lat1 = current.latitude;
    var lat2 = venue.latitude;

    var R = 6371000; // metres
    var φ1 = lat1.toRadians();
    var φ2 = lat2.toRadians();
    var Δφ = (lat2-lat1).toRadians();
    var Δλ = (lon2-lon1).toRadians();

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;

  },

  componentWillReceiveProps: function(nextProps) {
    var venue = nextProps.venue;
    var route = config.serverURL + '/api/venues/' + venue._id;

    var coords = nextProps.geolocation.coords;

    // Sets atVenue to true is user within 100 metres
    var distance = this.calculateDistance(coords, venue);
    this.setState({atVenue: distance < 100});

    fetch(route)
      .then(response => response.json())
      .then(json => this.setState({venue: json, dataSource: ds.cloneWithRows(json.comments)}))
    //this.setState({
    //  venue: venue,
    //  dataSource: ds.cloneWithRows(venue.comments)
    //});
  },

  componentWillMount: function() {
    // retrieve user id, may be replaced with device UUID in the future
    var context = this;
    fetch(config.serverURL + '/api/users/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({token: config.userToken})
    }) // no ;
    .then(response => response.json())
    .then(json => context.setState({user: json._id}));
  },

  getOverallRating() {
    var ratings = this.state.venue.ratings;
    var sum = 0;
    for (var i = 0; i < ratings.length; i++) {
      sum += ratings[i].rating;
    }
    var average = Math.round(sum / ratings.length);
    this.setState({overallRating: average});
  },

  setRoundVoteValue(voteValue) {
    voteValue *= 10;
    voteValue = Math.round(voteValue);
    this.setState({voteValue: voteValue})
  },

  renderComments(comments) {
    return <Text>{comments.datetime}: {comments.content}</Text>
    //return <Text>{comments}</Text>
  },

  submitComment() {
    //this gets called when "submit comment" gets pushed.
    // {
//   content: "Comment text",
//   creator: "55e39290c2b4e82b4839046a", // ID of the user posting the comment
//   venue: "55e394d6c2b4e82b48390473", // ID of the event that the comment is associated with
//   datetime: "2016-03-30T06:20:46.000Z",
//   atVenue: true
// }
    var content = this.state.content;
    var creator = 'fake token for now';
    var venue = this.state.venue._id;
    var datetime = new Date().toISOString();
    var atVenue = true;
    var postObj = {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': ''
      },
      body: JSON.stringify({
        'content': content,
        'creator': creator,
        'venue': venue,
        'datetime': datetime,
        'atVenue': atVenue
      })
    };
    fetch(config.serverURL + '/api/comments/', postObj)
      .then(function(res) {
        return res.json();
      })
      //.then(function(resJson) {
      //  return resJson;
      //})
  },

  render() {
    var venue = this.props.venue;
    return (
      <View>
        <Text style={styles.header}>
          Waz Kraken
        </Text>
        <Text style={styles.venueName}>
          {venue.title}
        </Text>
        <Text style={[styles.text, styles.alignLeft]} >
          Venue description: {venue.description}
        </Text>
        <Text style={[styles.text, styles.alignLeft]} >
          Address: {venue.address}
        </Text>
        <Text style={styles.text} >
          Time: {venue.datetime}
        </Text>
        <Text style={styles.text} >
          Overall rating: {venue.overallRating}
        </Text>
        <Text style={[styles.text, styles.yourRating]} >
          Your rating: {this.state.voteValue}
        </Text>
        <SliderIOS
          style={styles.slider}
          onValueChange={(voteValue) => this.setState({voteValue: Math.round(voteValue*10)})}
          onSlidingComplete={(voteValue) => {
            fetch(config.serverURL + '/api/venues/' + venue.id)
            .then(response => response.json())
            .then(modVenue => {
              for (var i = 0; i < modVenue.ratings.length; i++) {
                if (modVenue.ratings[i].user === this.state.user) {
                  modVenue.ratings[i].rating = Math.round(voteValue*10);
                  break;
                }
              }
              if (i === modVenue.ratings.length) {
                modVenue.ratings.push({
                  rating: Math.round(voteValue*10),
                  user: this.state.user
                });
              }
              fetch(config.serverURL + '/api/venues/', {
                method: 'put',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(modVenue)
              });
            });
          }}
          maximumTrackTintColor='red'/>
        <TextInput
          style={styles.textInput}
          onChangeText={(text) => this.setState({text})}
          value={this.state.text}
          onSubmitEditing={this._onSearchTextSubmit}
          returnKeyType='search'
          placeholder='Search'
          />
        />
        <Button style={styles.commentButton} onPress={this.submitComment}>
          Submit Comment
        </Button>
        <RefreshableListView
          style={styles.listView}
          dataSource={this.state.dataSource}
          renderRow={this.renderComments}
          loadData={this.reloadComments}
          refreshDescription="Refreshing comments"
          />

        <View style={{height: this.state.keyboardSpace}}></View>
      </View>

    );
  }
});

var styles = StyleSheet.create({
  text: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    margin: 3,
  },
  alignLeft: {
    //textAlign: 'left'
  },
  header: {
    fontSize: 22,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: '#000000',
    color: '#ffffff'
  },
  venueName: {
    fontSize: 20,
    textAlign: 'center'
  },
  yourRating: {
    marginBottom: 5
  },
  slider: {
    marginTop: 8,
    height: 20,
    marginLeft: 40,
    marginRight: 40,
    marginBottom: 10,
    flex: 0.5
  },
  textInput: {
    height: 30,
    borderColor: 'gray',
    margin: 5,
    marginBottom: 15,
    borderWidth: 1
  },
  commentButton: {
    fontSize: 20,
    flex: 1,
    textAlign: 'right',
    right: 10,
    alignSelf: 'flex-end'
  },
  listView: {
    margin: 10,
    flex: 1,
    bottom: 0,
    height: Display.height*.30
  }
});

module.exports = VenueTab;