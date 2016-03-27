
# Validation-Form

Simple form validation library.
Validation rules are to be delivered by data-* attributes.

## Requires

- jquery
- es5-shim (for legacy)
- json2 (for legacy)

## Basic Usage

### HTML

```
<form id="my-form" method="post" action="post.php">
    <h3>Name:</h3>
    <input type="text" name="name" data-validation="required; length(0, 100)">
    <h3>Email:</h3>
    <input type="text" name="email" data-validation="required; email; length(0, 50)">
    <p>Please input again</p>
    <input type="text" name="email_confirm" data-validation="required; equals(email)">
    <input type="submit" value="SEND">
</form>
```

### JavaScript

```
$("#my-form").validationForm({
    defaultMessage: "This field is required",
    messages: {
        name: {
            length: "Please input 100 characters or less"
        },
        email: {
            email: "Please input valid email address",
            length: "Please input 50 characters or less"
        },
        email_confirm: {
            equals: "Email addreses are not match"
        }
    }
});
```

## Options

|Option|Type|Default|Description|
|------|----|-------|----|
|submit|Boolean|true|If false, prevent submit event when validated|
|format|String|(read code)|Rule format string (RegExp)|
|delimiter|String|";"|Delimiter which separates rules|
|validateEvent|String|"change blur"|Events which trigger validation|
|messages|Object|null|Messages which is shown when invalid|
|messageClassName|String|"validation-message"|CSS class name for error message container|
|messagePosition|String|"after"|Position on which message container is inserted (before, after)|
|messageFade|Boolean|true|Fade-in/out error message or not|
|messageDuration|Number|300|Duration time for fade-in/out error message|

## Validation Methods

Apply validation methods by data-validation attribute as below.

```
<input name="name" ... data-validation="method; method(arg1, arg2); method(/regexparg/);">
```

|Method|Arguments|Description|
|------|----|-------|----|
|required|-|Check if it's not empty|
|equals|name:String|Check if value equals to the named element's value|
|length|min:Number, max:Number|Validate length of string|
|range|min:Number, max:Number|Validate range of number|
|email|-|Validate if value is valid email address|
|url|-|Validate if value is valid url|
|number|-|Validate if value is numeric string|
|integer|-|Validate if value is integer|
|pattern|pattern:RegExp|Validate value with pattern|

In the case that several elements are same named, such as checkbox or radio,
data-validation attribute need only to be added to one of them.

```
<!-- input[type=text] -->
<input type="text" name="name" data-validation="required; pattern(/^\d+$/)">
<input type="text" name="age" data-validation="required; integer; range(20, 60)">

<!-- input[type=radio], input[type=checkbox] -->
<label><input type="checkbox" name="color" value="red" data-validation="required"> Red</label>
<label><input type="checkbox" name="color" value="green"> Green</label>
<label><input type="checkbox" name="color" value="blue"> Blue</label>

<!-- select -->
<select name="browser" data-validation="required">
    <option value="">--Please Select--</option>
    <option value="chrome">Google Chrome</option>
    <option value="firefox">Firefox</option>
    <option value="edge">Microsoft Edge</option>
    <option value="other">Other</option>
</select>
```

## Filter Methods

Filter methods manupulate input's value before running validation methods.
Apply filter methods by data-filter attributes as below.

```
<input name="name" ... data-filter="method; method(arg1, arg2); method(/regexparg/);">
```

|Method|Arguments|Description|
|---|---|---|
|trim|-|Trim string|
|replace|pattern:RegExp(String), replacement:String|Replace pattern by replacement|
|zenhan|-|Replace multibyte string by single one|


## Other examples

### Async submit

```
$("#my-form").validationForm({
    submit: false, // prevent submit event
    ...
})
.on("validated", function(){
    // when submitting form and all inputs are validated,
    // "validated" event triggered on form element
    $(this).submitAsync().done(function(){
        // do something by response
    });
});
```
