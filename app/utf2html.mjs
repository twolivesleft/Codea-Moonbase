// utf2html.mjs
// Converts utf characters (special chars, emojis, etc.) into html entities.
// Useful when calling the forum API.

function utf2html(str) {
	return [...str].map((char) => char.codePointAt() > 127 ? `&#${char.codePointAt()};` : char).join('');
}

export default utf2html;
