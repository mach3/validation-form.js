(function($){

	// Utilities
	// ---------
	var u = {

		// Juggle array-like object to array
		// @param {Any} obj
		toArray: function(obj){
			return Array.prototype.slice.call(obj);
		},

		// Get type of the object or test it
		// @param {Any} obj
		// @param {String} test
		// @returns {String|Boolean}
		type: function(obj, test){
			var m, type;
			m = Object.prototype.toString.call(obj).match(/\[object\s(\w+)\]/);
			type = m ? m[1] : "Unknown";
			return test ? test === type : type;
		},

		// Bind functions (whose name started with "_") as object's method
		// @param {Object} obj
		delegate: function(obj){
			$.each(obj, function(key, value){
				if(/^_[a-z]/.test(key) && u.type(value, "Function")){
					obj[key] = value.bind(obj);
				}
			});
		},

		// Return formatted string
		// @param {String} template
		// @param {String, String...} value, value...
		format: function(){
			var args = this.toArray(arguments);
			return args.shift().replace(/%s/g, function(){
				return args.length ? args.shift() : "";
			});
		},

		// Render template with key-value object
		// @param {String} template
		// @param {Object} vars
		render: function(template, vars){
			return template.replace(/\{\{(\w+)\}\}/g, function(a, b){
				return (b in vars) ? vars[b] : "";
			});
		}
	};


	// ValidationForm Class
	// --------------------
	// @constructor
	// @param {Element} el
	// @param {Object} options
	$.ValidationForm = function(el, options){
		this.el = $(el);
		this.config(options);
		u.delegate(this);

		this.rules = {};
		this.filters = {};

		this.el.on(
			this.config("validateEvent"),
			"input[name], textarea[name], select[name]",
			this._onValidate
		)
		.on("submit", this._onSubmit);
	};

	$.extend($.ValidationForm.prototype, {

		EVENT_VALIDATED: "validated",
		EVENT_ERROR: "error",

		el: null,
		rules: null,
		filters: null,

		_options: {
			submit: true,
			format: "(\\w+)(?:\\((.+?)\\))?\\s?(?:{{delimiter}}|$)",
			delimiter: ";",
			validateEvent: "change blur",
			defaultMessage: "Invalid input",
			messages: null,
			messageClassName: "validation-message",
			messagePosition: "after",
			messageFade: true,
			messageDuration: 300
		},

		// Configure options
		// @param {String|Object} key|options
		// @param {Any} value
		// @returns {Any}
		config: function(){
			var args = u.toArray(arguments);
			this.options = this.options || $.extend(true, {}, this._options);
			switch(u.type(args[0])){
				case "Undefined": return this.options;
				case "Object": $.extend(true, this.options, args[0]); return this;
				case "String":
					if(args.length === 1){ return this.options[args[0]]; }
					this.options[args[0]] = args[1];
					return this;
				default: break;
			}
			return this;
		},

		// Handler: on submit form
		// @param {Event} e
		_onSubmit: function(e){
			var valid = true, my = this;

			this.el.find("input, textarea, select")
			.filter("[name]")
			.each(function(){
				if(! my.validate(this)){
					valid = false;
				}
			});
			if(! valid || ! this.config("submit")){
				e.preventDefault();
			}
			this.el.trigger(valid ? this.EVENT_VALIDATED : this.EVENT_ERROR);
		},

		// Handler: on change input value
		// @param {Event} e
		_onValidate: function(e){
			this.validate(e.currentTarget);
		},

		// Validate the element
		// @param {Element} el
		validate: function(el){
			var vars, r, f, valid, filter, invalid, equals, my = this;

			vars = this.el.serializeObject();
			r = this.parseRules(el);
			f = this.parseFilters(el);
			valid = $.ValidationForm.Valid;
			filter = $.ValidationForm.Filter;
			invalid = null;

			// apply filters
			if(f){
				f.forEach(function(o){
					if(! (o.name in filter)){ return; }
					filter[o.name].apply(el, o.args);
				});
			}

			// find equals
			$.each(this.rules, function(k, v){
				if(v.equals === el.name){
					my.validate(my.getElementByName(k));
				}
			});

			// no rule asigned
			if(! r){
				return this.message(el, false);
			}

			// check required
			if(! vars[el.name]){
				if(r.required){
					return this.message(el, "required");
				} else {
					return this.message(el, false);
				}
			}

			// check rules
			if(r.items.length){
				r.items.forEach(function(o){
					if(!! invalid){ return; }
					if(! (o.name in valid)){ return; }
					if(! valid[o.name].apply(el, o.args)){
						invalid = o.name;
					}
				});
				if(!! invalid){
					return this.message(el, invalid);
				}
			}

			// check equals
			if(r.equals){
				equals = this.getElementByName(r.equals);
				if(!! equals && equals.value !== el.value){
					return this.message(el, "equals");
				}
			}

			return this.message(el, false);
		},

		// Get named element
		// @param {String} name
		// @returns {Element}
		getElementByName: function(name){
			var el = this.el.find(u.format("[name=%s]", name));
			return el.length ? el[0] : null;
		},

		// Show or hide error message, return validated as boolean
		// @param {Element} el
		// @param {String} key
		// @returns {Boolean}
		message: function(el, key){
			var o, message, dest, node;

			o = this.config();
			message = (function(){
				if(! key){ return null; }
				return (o.messages && o.messages[el.name] && o.messages[el.name][key]) ?
				o.messages[el.name][key] : o.defaultMessage;
			}());
			dest = this.el.find(u.format(".%s[data-for=%s]", o.messageClassName, el.name));
			dest = dest.length ? dest : $("<div>", {
				"class": o.messageClassName,
				"data-for": el.name
			})[o.messagePosition === "before" ? "insertBefore" : "insertAfter"](el).hide();

			node = $(el)
			.toggleClass("invalid", !! message)
			.toggleClass("valid", ! message);

			if(! message){
				dest.stop()[o.messageFade ? "fadeOut" : "hide"](o.messageDuration);
			} else {
				dest.text(message).stop()[o.messageFade ? "fadeIn" : "show"](o.messageDuration);
				node.trigger("invalid");
			}

			return ! message;
		},

		// Parse rule string in data-validation attribute
		// @param {Element} el
		// @returns {Object}
		parseRules: function(el){
			var o, data, rules, format, my = this;

			if(el.name in this.rules){
				return this.rules[el.name];
			}

			o = this.config();
			data = $(el).data("validation");
			rules = {
				required: false,
				equals: null,
				items: []
			};
			format = new RegExp(u.render(o.format, {delimiter: o.delimiter}), "g");

			if(data){
				data.replace(format, function(a,b,c){
					if(b === "required"){
						rules.required = true;
						return;
					}
					if(b === "equals"){
						rules.equals = c;
						return;
					}
					rules.items.push({
						name: b,
						args: my.parseArgs(c)
					});
				});

				this.rules[el.name] = rules;
				return rules;
			}
			return null;
		},


		// Parse filter string in data-filter attribute
		// @param {Element} el
		// @returns {Object}
		parseFilters: function(el){
			var o, data, format, filters = [], my = this;

			if(el.name in this.filters){
				return this.filters[el.name];
			}

			o = this.config();
			data = $(el).data("filter");
			format = new RegExp(u.render(o.format, {delimiter: o.delimiter}), "g");

			if(data){
				data.replace(format, function(a,b,c){
					filters.push({
						name: b,
						args: my.parseArgs(c)
					});
				});
				this.filters[el.name] = filters;
				return filters;
			}

			return null;
		},

		// Parse argument string
		// @param {String} str
		// @returns {Array}
		parseArgs: function(str){
			var p, r = [], s = [], args;

			if(! u.type(str, "String")){
				return [];
			}

			p = {
				regex: /\/(.+?)\/\s?(,|$)/g,
				string: /'(.+)'\s?(,|$)/g
			};
			args = str
			.replace(p.regex, function(a,b,c){
				r.push(new RegExp(b));
				return "__REGEX__" + c;
			})
			.replace(p.string, function(a,b,c){
				s.push(b);
				return "__STRING__" + c;
			})
			.split(",")
			.map(function(a){
				a = $.trim(a);
				switch(true){
					case /__REGEX__/.test(a): return r.shift();
					case /__STRING__/.test(a): return s.shift();
					case /^\d+(\.\d+)?$/.test(a): return Number(a);
					default: break;
				}
				return a;
			});

			return args;
		}
	});

	// ValidationForm.Valid
	// --------------------
	// Collection of method to validate
	// These functions are called with `apply` to element
	// All returns valid or not as boolean
	$.ValidationForm.Valid = {

		// Validate length of value
		// @param {Number} min
		// @param {Number} max
		length: function(min, max){
			var len = this.value.length;
			return len >= min && len <= max;
		},

		// Validate range of number value
		// @param {Number} min
		// @param {Number} max
		range: function(min, max){
			var value = Number(this.value);
			min = Number(min);
			max = Number(max);
			return value >= min && value <= max;
		},

		// Validate if it's email string
		email: function(){
			var r = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
			return r.test(this.value);
		},

		// Validate if it's url string
		url: function(el){
			var scheme, ip, host, port, path, r;
			scheme = "(https|http)\://";
			ip = "(\\d{1,3}(\\.\\d{1,3}){3})";
			host = "([a-z0-9\\-]+(\\.[a-z0-9\\-]+)*?)";
			port = "(:[\\d]{1,5})";
			path = "[^\\\\'\\|`\\^\"<>\\(\\)\\{\\}\\[\\]]+";
			r = new RegExp(u.format("^%s(%s|%s)(%s)?(%s)?$", scheme, ip, host, port, path));
			return r.test(this.value);
		},

		// Validate if it's number string
		number: function(){
			return /^\d+(\.\d+)?$/.test(this.value);
		},

		// Vlaidate if it's integer string
		integer: function(){
			return /^\d+$/.test(this.value);
		},

		// Validate value with regexp pattern
		// @param {String} pattern
		pattern: function(pattern){
			return pattern.test(this.value);
		}
	};

	// ValidationForm.Filter
	// ---------------------
	// Collection of method to apply filter to input value
	// These functions are called with `apply` to element
	$.ValidationForm.Filter = {

		// Trim
		trim: function(){
			this.value = $.trim(this.value);
		},

		// Replace by string or regexp
		// @param {String|RegExp} pattern 
		// @param {String} replacement 
		replace: function(pattern, replacement){
			this.value = this.value.replace(pattern, replacement);
		},

		// Replace multibyte string to singlebyte one
		zenhan: function(){
			var map, values;
			map = {
				"han": [
					49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 97, 98, 99, 100, 101, 102,
					103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
					116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72,
					73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
					90, 45, 94, 92, 33, 34, 35, 36, 37, 38, 39, 40, 41, 61, 126, 124,
					96, 123, 43, 42, 125, 60, 62, 63, 95, 64, 91, 59, 58, 93, 44, 46,
					47, 45
				],
				"zen": [
					65297, 65298, 65299, 65300, 65301, 65302, 65303, 65304, 65305,
					65296, 65345, 65346, 65347, 65348, 65349, 65350, 65351, 65352,
					65353, 65354, 65355, 65356, 65357, 65358, 65359, 65360, 65361,
					65362, 65363, 65364, 65365, 65366, 65367, 65368, 65369, 65370,
					65313, 65314, 65315, 65316, 65317, 65318, 65319, 65320, 65321,
					65322, 65323, 65324, 65325, 65326, 65327, 65328, 65329, 65330,
					65331, 65332, 65333, 65334, 65335, 65336, 65337, 65338, 65293,
					65342, 65509, 65281, 8221, 65283, 65284, 65285, 65286, 8217, 65288,
					65289, 65309, 65374, 65372, 65344, 65371, 65291, 65290, 65373,
					65308, 65310, 65311, 65343, 65312, 65339, 65307, 65306, 65341,
					65292, 65294, 65295, 8722
				]
			};
			values = u.toArray(this.value).map(function(s){
				var index = map.zen.indexOf(s.charCodeAt(0));
				if(index < 0){ return s; }
				return String.fromCharCode(map.han[index]);
			});
			this.value = values.join("");
		}
	};


	// Expose
	// ------
	$.fn.extend({

		// Apply ValidationForm
		// @param {Object} options
		validationForm: function(options){
			var key = "__validationFormInstance__";
			return this.each(function(){
				if(key in this){ return; }
				this[key] = new $.ValidationForm(this, options);
			});
		},

		// Serialize form's values as object
		serializeObject: function(){
			var vars = {};
			this.serializeArray().forEach(function(item){
				if(item.name in vars){
					if(! u.type(vars[item.name], "Array")){
						vars[item.name] = [vars[item.name]];
					}
					vars[item.name].push(item.value);
					return;
				}
				vars[item.name] = item.value;
			});
			return vars;
		},

		// Submit by Ajax
		// @param {String} json (optional)
		submitAsync: function(json){
			var data, form = this.eq(0);
			data = (function(){
				var data = {}, vars = form.serializeObject();
				if(json){
					data[json] = JSON.stringify(vars);
					return data;
				}
				return vars;
			}());
			return $.ajax({
				url: form.prop("action"),
				type: form.prop("method"),
				data: data
			});
		}
	});

}(jQuery));