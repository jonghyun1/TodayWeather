// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'ngCordova'])

    .run(function($ionicPlatform) {
        $ionicPlatform.ready(function() {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);

            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                //StatusBar.styleLightContent();
                StatusBar.hide();
                ionic.Platform.fullScreen();
            }
        });
    })

    .config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

        // Ionic uses AngularUI Router which uses the concept of states
        // Learn more here: https://github.com/angular-ui/ui-router
        // Set up the various states which the app can be in.
        // Each state's controller can be found in controllers.js
        $stateProvider

            // setup an abstract state for the tabs directive
            .state('tab', {
                url: '/tab',
                abstract: true,
                templateUrl: 'templates/tabs.html'
            })

            // Each tab has its own nav history stack:

            .state('tab.dash', {
                url: '/dash',
                views: {
                    'tab-dash': {
                        templateUrl: 'templates/tab-dash.html',
                        controller: 'DashCtrl'
                    }
                }
            })

            .state('tab.chats', {
                url: '/chats',
                views: {
                    'tab-chats': {
                        templateUrl: 'templates/tab-chats.html',
                        controller: 'ChatsCtrl'
                    }
                }
            })
            .state('tab.chat-detail', {
                url: '/chats/:chatId',
                views: {
                    'tab-chats': {
                        templateUrl: 'templates/chat-detail.html',
                        controller: 'ChatDetailCtrl'
                    }
                }
            })

            .state('tab.account', {
                url: '/account',
                views: {
                    'tab-account': {
                        templateUrl: 'templates/tab-account.html',
                        controller: 'AccountCtrl'
                    }
                }
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/tab/dash');

        $ionicConfigProvider.tabs.style('standard');
        $ionicConfigProvider.tabs.position('bottom');
    })
    .directive('ngTempChart', function() {
        return {
            restrict: 'A',
            transclude: true,
            link: function (scope, iElement) {
                var margin = {top: 20, right: 0, bottom: 20, left: 0},
                    width = iElement[0].getBoundingClientRect().width - margin.left - margin.right,
                    height = iElement[0].getBoundingClientRect().height - margin.top - margin.bottom;

                var svg = d3.select(iElement[0]).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var x = d3.scale.ordinal()
                    .rangeRoundBands([width, 0]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var color = d3.scale.category10();

                var line = d3.svg.line()
                    .defined(function (d) {
                        return d.value != '';
                    })
                    .interpolate("cardinal")
                    .x(function (d, i) {
                        return x(i) + x.rangeBand() / 2
                    })
                    .y(function (d) {
                        return y(d.value);
                    });

                scope.$watch('temp', function (newVal) {
                    if (newVal) {
                        var data = [];
                        angular.forEach(scope.temp, function (value) {
                            data.push(value);
                        });

                        color.domain(d3.keys(data[0]).filter(function (key) {
                            return key !== "id";
                        }));

                        var column = color.domain().map(function (name) {
                            return {
                                name: name,
                                values: data.map(function (d) {
                                    return {name: name, id: d.id, value: d[name]};
                                })
                            };
                        });

                        x.domain(d3.range(data.length));
                        console.log(column[0].values[0]);

                        y.domain([
                            d3.min(column, function (c) {
                                return d3.min(c.values, function (v) {
                                    return v.value;
                                });
                            }),
                            d3.max(column, function (c) {
                                return d3.max(c.values, function (v) {
                                    return v.value;
                                });
                            })
                        ]).nice();

                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom");

                        var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left");

                        var group = svg.selectAll(".line_group")
                            .data(column);

                        var group_enter = group.enter()
                            .append("g")
                            .attr("class", "line_group");

                        // draw line
                        group_enter.append("path")
                            .attr("class", "line")
                            .attr("d", function(d) { return line(d.values); })
                            .style("stroke", function(d) { return color(d.name); })
                            .style("stroke-width", "1.5px")
                            .style("fill", "none");

                        // update line
                        group.select('.line')
                            .attr("d", function(d) { return line(d.values); });

                        // draw point
                        var point = group_enter.append("g")
                            .attr("class", "line-point");

                        point.selectAll('circle')
                            .data(function(d) { return d.values; })
                            .enter().append('circle')
                            .attr("cx", function(d, i) { return x(i) + x.rangeBand() / 2; })
                            .attr("cy", function(d) { return y(d.value); })
                            .attr("r", 5)
                            .style("fill", function(d) { return color(d.name); });

                        // update point
                        group.select('.line-point')
                            .selectAll('circle')
                            .data(function(d) { return d.values; })
                            .attr("cx", function(d, i) { return x(i) + x.rangeBand() / 2; })
                            .attr("cy", function(d) { return y(d.value); });

                        // draw value
                        var value = group_enter.append('g')
                            .attr('class','line-value');

                        value.selectAll('text')
                            .data(function(d) { return d.values; })
                            .enter().append('text')
                            .attr("x", function(d, i) { return x(i) + x.rangeBand() / 2; })
                            .attr("y", function(d) { return y(d.value); })
                            .attr('dy', -10)
                            .attr("text-anchor", "middle")
                            .text(function(d) { return d.value; });

                        // update value
                        group.select('.line-value')
                            .selectAll('text')
                            .data(function(d) { return d.values; })
                            .attr("x", function(d, i) { return x(i) + x.rangeBand() / 2; })
                            .attr("y", function(d) { return y(d.value); })
                            .text(function(d) { return d.value; });
                    }
                });
            }
        };
    });