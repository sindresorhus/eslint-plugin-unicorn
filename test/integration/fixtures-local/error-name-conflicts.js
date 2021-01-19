function foo() {
	try {
	} catch (err) {
		console.log(err);

		if (test) {
			throw a;
		} else {
			throw b;
		}
	}
}
