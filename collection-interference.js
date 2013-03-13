Things = new Meteor.Collection("things");

Totals = new Meteor.Collection("totals");

if (Meteor.isServer) {
	// Clear collection before each test.
  Things.remove({});
	
	Meteor.publish("things", function(params) {
		return Things.find({ filter: params.filter });
	});
	
	// Publishes a one-record collection that has a count of unfiltered thing 
	// records.
	Meteor.publish("totals", function() {
		var self = this;
		var uuid = Meteor.uuid();
		var count = 0;
		var initializing = true;
		
		// No arguments for find() because we want all of the documents - no filter.
		var thingsHandle = Things.find({}).observeChanges({
			added: function() {
				console.log('count', count);
				count++;
				if (!initializing) {
					self.changed("totals", uuid, { count: count });
				}
			},
			removed: function() {
				count--;
				if (!initializing) {
					self.changed("totals", uuid, { count: count });
				}
			}
		});

		initializing = false;
		
		// Publish the initial counts. ObserveChanges guaranteed not to return
	  // until the initial set of `added` callbacks have run, so the `count`
	  // variable is up to date.
		self.added("totals", uuid, { count: count });
		
		self.ready();
				
		self.onStop(function() {
			thingsHandle.stop();
		});
	});
}

Meteor.methods({
	createThing: function(options) {
    options = options || {};
    if (!(typeof options.name === "string" && options.name.length &&
			typeof options.filter === "string" && options.filter.length)) {
      throw new Meteor.Error(400, "Required parameter missing");
		}

    return Things.insert({ name: options.name, filter: options.filter });
	}
});
	
if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to collection-interference.";
  };

  Template.hello.events({
    'click input#createThings' : function () {
      // template data, if any, is available in 'this'
			
			function createThing(name, filter) {
				Meteor.call('createThing', { name: name, filter: filter }, 
					function(error, thingId) {
						if (error) {
							console.log("Error creating thing!");
						}
					});
			}
			
			createThing("Thing 1", "Filter A");
			createThing("Thing 2", "Filter A");
			createThing("Thing 3", "Filter A");
			createThing("Thing 4", "Filter A");
			createThing("Thing 5", "Filter B");
			createThing("Thing 6", "Filter B");
			createThing("Thing 7", "Filter B");
    }
  });
	
	Template.Filter.events({
		'click select': function(event) {
			Session.set('currentFilter', $('select').val());
		}
	});
	
	Template.ThingList.things = function() {
		return Things.find();
	}
	
	Template.Total.total = function() {
		console.log("Looking for total.");
		var thingCount = 0;
		var total = Totals.findOne();
		if (total) {
			thingCount = total.count;
		}
		return thingCount;
	}

  Meteor.startup(function () {
    // code to run on server at startup
		Meteor.autorun(function() {
		  Meteor.subscribe('things', { filter: Session.get('currentFilter')}, 
				function() {});
								
			Meteor.subscribe('totals', {}, function() {});
  	});
	});
}
