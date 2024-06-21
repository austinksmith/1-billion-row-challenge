# Hamsters-Socket

**Author**: Austin K. Smith

**Website**: [asmithdev.com](http://www.asmithdev.com)

**Description**: The 1 Billion Row Challenge Implemented in Node and Ruby

**License**: Artistic License 2.0

# Node.js Setup

* Clone the repository
* Run `npm install`
* Run `npm start`

# Ruby Setup

* Clone the repository
* Install [ruby using official site](https://www.ruby-lang.org/en/documentation/installation/)
* `gem install concurrent-ruby`
* Run `npm run ruby`

# JRuby Setup

* Clone the repository
* Install [jruby using official site](https://www.jruby.org/)
* `gem install concurrent-ruby`
* Run `npm run jruby`

# Considerations

Both the jRuby and Ruby implementation use the exact same file and logic, both using the concurrent-ruby gem for threading, unfortunately in normal Ruby we have
a global interpreter lock that prevents multiple threads from executing at a time, this means our ruby implmentation is extremely slow. Switching to running the file with jRuby
eliminates this limitation allowing us to fully use our cpu threads and have multiple threads executing logic at at time.