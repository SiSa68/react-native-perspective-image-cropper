import React, { Component } from 'react';
import {
    NativeModules,
    PanResponder,
    Dimensions,
    Image,
    View,
    Animated,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const ZOOM_BOX = {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').height * 0.11,
    verticalMargin: 5,
}
const BOTTOM_MARGIN = 30;
const HORIZONTAL_MARGIN = 30;
const WINDOWS_WIDTH = Dimensions.get('window').width - (HORIZONTAL_MARGIN * 2);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

class CustomCrop extends Component {
    constructor(props) {
        super(props);

        this.state = {
            viewWidth: WINDOWS_WIDTH,
            viewHeight:
                WINDOWS_WIDTH * (props.height / props.width),
            height: props.height,
            width: props.width,
            image: props.initialImage,
            path: props.path,
            activePointer: null,
        };
        this.state = {
            ...this.state,
            topLeft: new Animated.ValueXY({ x: 100, y: 100 }),
            topRight: new Animated.ValueXY({ x: WINDOWS_WIDTH - 100, y: 100 }),
            bottomLeft: new Animated.ValueXY({ x: 100, y: this.state.viewHeight - 100 }),
            bottomRight: new Animated.ValueXY({
                x: WINDOWS_WIDTH - 100,
                y: this.state.viewHeight - 100,
            }),
        }
        this.state = {
            ...this.state,
            overlayPositions: `${this.state.topLeft.x._value},${
                this.state.topLeft.y._value
            } ${this.state.topRight.x._value},${this.state.topRight.y._value} ${
                this.state.bottomRight.x._value
            },${this.state.bottomRight.y._value} ${
                this.state.bottomLeft.x._value
            },${this.state.bottomLeft.y._value}`,
        }

        this.panResponderTopLeft = this.createPanResponser(this.state.topLeft, 'TL');
        this.panResponderTopRight = this.createPanResponser(
            this.state.topRight,
            'TR',
        );
        this.panResponderBottomLeft = this.createPanResponser(
            this.state.bottomLeft,
            'BL',
        );
        this.panResponderBottomRight = this.createPanResponser(
            this.state.bottomRight,
            'BR',
        );
    }

    init = () => {
        const { rectangleCoordinates } = this.props;

        this.state.topLeft.setValue(
            rectangleCoordinates
                    ? this.imageCoordinatesToViewCoordinates(
                          rectangleCoordinates.topLeft,
                          true,
                      )
                    : { x: 100, y: 100 }
        );

        this.state.topRight.setValue(
            rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(
                    rectangleCoordinates.topRight,
                    true,
                )
                : { x: WINDOWS_WIDTH - 100, y: 100 }
        );

        this.state.bottomLeft.setValue(
            rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(
                        rectangleCoordinates.bottomLeft,
                        true,
                    )
                : { x: 100, y: this.state.viewHeight - 100 }
        );

        this.state.bottomRight.setValue(
            rectangleCoordinates
                ? this.imageCoordinatesToViewCoordinates(
                    rectangleCoordinates.bottomRight,
                    true,
                )
                : {
                    x: WINDOWS_WIDTH - 100,
                    y: this.state.viewHeight - 100,
                },
        );

        this.updateOverlayString();
    }

    createPanResponser(corner, pointer) {
        return PanResponder.create({
            onStartShouldSetPanResponder: (evt) => 
                evt.target === this.tlRe ||
                evt.target === this.tlRo ||
                evt.target === this.trRe ||
                evt.target === this.trRo ||
                evt.target === this.blRe ||
                evt.target === this.blRo ||
                evt.target === this.brRe ||
                evt.target === this.brRo,
            onPanResponderMove: Animated.event([
                null,
                {
                    dx: corner.x,
                    dy: corner.y,
                },
            ], {
                useNativeDriver: false,
            }),
            // onPanResponderMove: (e, gesture) => {
            //     corner.setValue({
            //         x: gesture.dx,
            //         y: gesture.dy
            //     });
            //     // this.updateOverlayString();
            // },
            onPanResponderRelease: () => {
                corner.flattenOffset();
                this.updateOverlayString();
                this.setState({activePointer: null});
            },
            onPanResponderTerminate: () => {
                corner.flattenOffset();
                this.updateOverlayString();
                this.setState({activePointer: null});
            },
            onPanResponderGrant: () => {
                corner.flattenOffset();
                this.updateOverlayString();
                this.setState({activePointer: pointer});
                
                corner.setOffset({ x: corner.x._value, y: corner.y._value });
                corner.setValue({ x: 0, y: 0 });
            },
        });
    }

    crop() {
        const coordinates = {
            topLeft: this.viewCoordinatesToImageCoordinates(this.state.topLeft),
            topRight: this.viewCoordinatesToImageCoordinates(
                this.state.topRight,
            ),
            bottomLeft: this.viewCoordinatesToImageCoordinates(
                this.state.bottomLeft,
            ),
            bottomRight: this.viewCoordinatesToImageCoordinates(
                this.state.bottomRight,
            ),
            height: this.state.height,
            width: this.state.width,
        };
        // console.log("path", this.state.path, coordinates, this.state.image)
        NativeModules.CustomCropManager.crop(
            coordinates,
            this.state.path,
            (err, res) => this.props.updateImage(res.image, coordinates),
        );
    }

    updateOverlayString() {
        this.setState({
            overlayPositions: `${this.state.topLeft.x._value},${
                this.state.topLeft.y._value
            } ${this.state.topRight.x._value},${this.state.topRight.y._value} ${
                this.state.bottomRight.x._value
            },${this.state.bottomRight.y._value} ${
                this.state.bottomLeft.x._value
            },${this.state.bottomLeft.y._value}`,
        });
    }

    imageCoordinatesToViewCoordinates(corner) {
        return {
            x: (corner.x * this.state.viewWidth) / this.state.width,
            y: (corner.y * this.state.viewHeight) / this.state.height,
        };
    }

    viewCoordinatesToImageCoordinates(corner) {
        return {
            x:
                (corner.x._value / this.state.viewWidth) *
                this.state.width,
            y: (corner.y._value / this.state.viewHeight) * this.state.height,
        };
    }

    onRootViewLayout = (event) => {
        const rootSize = event.nativeEvent.layout;
        if (
          !rootSize ||
          !rootSize.width ||
          !rootSize.height ||
          rootSize.width <= 0 ||
          rootSize.height <= 0
        )
          return;

        let viewHeight = rootSize.height - 
                            ZOOM_BOX.height - ZOOM_BOX.verticalMargin * 2 - 
                            BOTTOM_MARGIN;
        let viewWidth = rootSize.width - HORIZONTAL_MARGIN * 2;

        if(this.props.height > this.props.width)
            viewWidth = (this.props.width / this.props.height) * viewHeight;
        else
            viewHeight = (this.props.height / this.props.width) * viewWidth;

        this.setState({viewWidth, viewHeight}, this.init);
    }

    renderZoomPointerIcon = () => {
        const {activePointer} = this.state;

        if(activePointer === 'TL')
            return (
                <View style={{position: 'absolute', left: ZOOM_BOX.width/2 - 39, top: ZOOM_BOX.height/2 - 39}}>
                    <View style={{
                        width: 39, height: 39,
                        borderRadius: 39/2,
                        backgroundColor: this.props.handlerColor
                    }} />
                    <View style={{
                        width: 20, height: 20,
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        backgroundColor: this.props.handlerColor
                    }} />
                </View>
            );
        else if(activePointer === 'TR')
            return (
                <View style={{position: 'absolute', left: ZOOM_BOX.width/2, top: ZOOM_BOX.height/2 - 39}}>
                    <View style={{
                        width: 39, height: 39,
                        borderRadius: 39/2,
                        backgroundColor: this.props.handlerColor
                    }} />
                    <View style={{
                        width: 20, height: 20,
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        backgroundColor: this.props.handlerColor
                    }} />
                </View>
            );
        else if(activePointer === 'BL')
            return (
                <View style={{position: 'absolute', left: ZOOM_BOX.width/2 - 39, top: ZOOM_BOX.height/2}}>
                    <View style={{
                        width: 39, height: 39,
                        borderRadius: 39/2,
                        backgroundColor: this.props.handlerColor
                    }} />
                    <View style={{
                        width: 20, height: 20,
                        position: 'absolute',
                        right: 0,
                        backgroundColor: this.props.handlerColor
                    }} />
                </View>
            );
        else
            return (
                <View style={{position: 'absolute', left: ZOOM_BOX.width/2, top: ZOOM_BOX.height/2}}>
                    <View style={{
                        width: 39, height: 39,
                        borderRadius: 39/2,
                        backgroundColor: this.props.handlerColor
                    }} />
                    <View style={{
                        width: 20, height: 20,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        backgroundColor: this.props.handlerColor
                    }} />
                </View>
            );
    }

    render() {
        const {activePointer} = this.state;

        let zoomPointer = this.state.topLeft;
        if(activePointer === 'TR')
            zoomPointer = this.state.topRight;
        else if(activePointer === 'BL')
            zoomPointer = this.state.bottomLeft;
        else if(activePointer === 'BR')
            zoomPointer = this.state.bottomRight;
        
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                }}
                onLayout={this.onRootViewLayout}
            >
                <View
                    style={{
                        width: ZOOM_BOX.width,
                        height: ZOOM_BOX.height,
                        marginVertical: ZOOM_BOX.verticalMargin,
                        // borderWidth: 1,
                        borderRadius: 10,
                        borderColor: 'green',
                        backgroundColor: 'black',
                        overflow: 'hidden',
                        opacity: this.state.activePointer ? 1 : 0,
                    }}
                >
                    <Animated.Image
                        style={{
                            width: this.state.viewWidth,
                            height: this.state.viewHeight,
                            position: 'absolute',
                            left: zoomPointer.x.interpolate({
                                inputRange: [0, this.state.viewWidth],
                                outputRange: [
                                    this.state.viewWidth/2 + ZOOM_BOX.width/2,
                                    -this.state.viewWidth*1.5 + ZOOM_BOX.width/2
                                ],
                                extrapolate: 'clamp'
                            }),
                            top: zoomPointer.y.interpolate({
                                inputRange: [0, this.state.viewHeight],
                                outputRange: [
                                    this.state.viewHeight/2 + ZOOM_BOX.height/2,
                                    -this.state.viewHeight*1.5 + ZOOM_BOX.height/2
                                ],
                                extrapolate: 'clamp'
                            }),
                            transform: [
                                { scale: 2 }
                            ]
                        }}
                        source={{ uri: this.state.image }}
                    />

                    {this.renderZoomPointerIcon()}
                </View>

                <View
                    style={{
                        width: this.state.viewWidth,
                        height: this.state.viewHeight
                    }}
                >
                    <Image
                        style={{
                            width: this.state.viewWidth,
                            height: this.state.viewHeight
                        }}
                        resizeMode="contain"
                        source={{ uri: this.state.image }}
                    />
                    <Svg
                        height={this.state.viewHeight}
                        width={this.state.viewWidth}
                        style={{ position: 'absolute', left: 0, top: 0 }}
                    >
                        <AnimatedPolygon
                            ref={(ref) => (this.polygon = ref)}
                            fill={this.props.overlayColor || 'blue'}
                            fillOpacity={this.props.overlayOpacity || 0.5}
                            stroke={this.props.overlayStrokeColor || 'blue'}
                            points={this.state.overlayPositions}
                            strokeWidth={this.props.overlayStrokeWidth || 3}
                        />
                    </Svg>
                    <Animated.View
                        {...this.panResponderTopLeft.panHandlers}
                        style={[
                            this.state.topLeft.getLayout(),
                            s(this.props).handler,
                        ]}
                    >
                        <View
                            ref={r => this.tlRe = r}
                            style={[
                                s(this.props).handlerI,
                                { left: -10, top: -10 },
                            ]}
                        />
                        <View
                            ref={r => this.tlRo = r}
                            style={[
                                s(this.props).handlerRound,
                                { left: 31, top: 31 },
                            ]}
                        />
                    </Animated.View>
                    <Animated.View
                        {...this.panResponderTopRight.panHandlers}
                        style={[
                            this.state.topRight.getLayout(),
                            s(this.props).handler,
                        ]}
                    >
                        <View
                            ref={r => this.trRe = r}
                            style={[
                                s(this.props).handlerI,
                                { left: 10, top: -10 },
                            ]}
                        />
                        <View
                            ref={r => this.trRo = r}
                            style={[
                                s(this.props).handlerRound,
                                { right: 31, top: 31 },
                            ]}
                        />
                    </Animated.View>
                    <Animated.View
                        {...this.panResponderBottomLeft.panHandlers}
                        style={[
                            this.state.bottomLeft.getLayout(),
                            s(this.props).handler,
                        ]}
                    >
                        <View
                            ref={r => this.blRe = r}
                            style={[
                                s(this.props).handlerI,
                                { left: -10, top: 10 },
                            ]}
                        />
                        <View
                            ref={r => this.blRo = r}
                            style={[
                                s(this.props).handlerRound,
                                { left: 31, bottom: 31 },
                            ]}
                        />
                    </Animated.View>
                    <Animated.View
                        {...this.panResponderBottomRight.panHandlers}
                        style={[
                            this.state.bottomRight.getLayout(),
                            s(this.props).handler,
                        ]}
                    >
                        <View
                            ref={r => this.brRe = r}
                            style={[
                                s(this.props).handlerI,
                                { left: 10, top: 10 },
                            ]}
                        />
                        <View
                            ref={r => this.brRo = r}
                            style={[
                                s(this.props).handlerRound,
                                { right: 31, bottom: 31 },
                            ]}
                        />
                    </Animated.View>
                </View>
            </View>
        );
    }
}

const s = (props) => ({
    handlerI: {
        borderRadius: 0,
        height: 20,
        width: 20,
        backgroundColor: props.handlerColor || 'blue',
        zIndex: 1000,
    },
    handlerRound: {
        width: 39,
        position: 'absolute',
        height: 39,
        borderRadius: 100,
        backgroundColor: props.handlerColor || 'blue',
    },
    bottomButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'blue',
        width: 70,
        height: 70,
        borderRadius: 100,
    },
    handler: {
        height: 140,
        width: 140,
        overflow: 'visible',
        marginLeft: -70,
        marginTop: -70,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
});

export default CustomCrop;
