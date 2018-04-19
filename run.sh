docker run --rm -it -p 19000:19000 -p 19001:19001 \
	-v ${PWD}:/home/node/app \
	--workdir /home/node/app \
	--user 1000:1000 \
	asssaf/expo
