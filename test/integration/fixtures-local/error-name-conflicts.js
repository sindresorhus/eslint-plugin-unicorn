function foo() {
	try {} catch (error_) {
		console.log(error_);

		const error = test ? a : b;
		throw error;
	}
}
