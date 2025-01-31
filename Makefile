.PHONY: test prod

test:
	sudo ./docker_build_run.sh test

prod:
	sudo ./docker_build_run.sh prod