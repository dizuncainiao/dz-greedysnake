const checkerboardContainer = document.querySelector('#checkerboard') // 棋盘容器
const GRID_NUM = 20 // 棋盘格数
const playBtn = document.getElementById('play')
const difficultySelect = document.getElementById('difficulty')
const modeSelect = document.getElementById('mode')
const notifyBox = document.getElementById('notify')
const timeBox = document.getElementById('time')
const scoreBox = document.getElementById('score')

const _ = {
    random(min, max) {
        return Math.floor(Math.random() * (max - min) + min)
    },
    inRange(target, [min, max]) {
        return target >= min && target <= max
    },
    isEqual(arr, arr2) {
        return arr[0] === arr2[0] && arr[1] === arr2[1]
    },
    getCoordinate(className) {
        return className.replace('S', '').split('_')
    },
    formatDate(seconds) {
        seconds = Math.floor(seconds)
        const h = Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}小时` : ''
        const m = Math.floor((seconds % 3600) / 60) ? `${Math.floor((seconds % 3600) / 60)}分` : ''
        const s = (seconds % 3600) % 60 ? `${(seconds % 3600) % 60}秒` : ''
        return `${h}${m}${s}`
    }
}

/**
 * 棋盘 20 * 20
 * 坐标：1-1, ... 1-20, ... 20-20
 */
class Checkerboard {
    constructor(container, gridNum) {
        this.container = container
        this.gridNum = gridNum
        this.generate()
    }

    // 每个格子类名为：SX轴坐标_Y轴坐标 S1_20
    generate() {
        const fragment = document.createDocumentFragment()
        for (let i = 0; i < this.gridNum; i++) {
            for (let j = 0; j < this.gridNum; j++) {
                const grid = document.createElement('div')
                grid.classList.add('square', `S${j + 1}_${i + 1}`)
                fragment.appendChild(grid)
            }
        }
        this.container.appendChild(fragment)
    }
}

/**
 * 蛇
 */
class Snake {
    static keyCodes = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']

    constructor(gridNum, overHandler) {
        this.timer = null // 定时器
        this.gridNum = gridNum // 格子数
        this.highestScore = gridNum * gridNum // 最高分，通关判断
        this.speed = 1000 // 速度
        this.mode = 'normal' // 模式
        this.time = 0 // 游戏时间
        this.score = 3 // 游戏分数
        this.overHandler = overHandler
        this.coordinates = [] // 可用的坐标
        this.snakeCoordinates = [] // 蛇占用的坐标（蛇占用的坐标 + 可用的坐标 = 全部坐标）
        this.direction = 'ArrowRight' // 蛇前进的方向 ArrowUp|ArrowRight|ArrowDown|ArrowLeft
        this.snakeHead = [1, 1] // 蛇头坐标
        this.foodCoordinate = [gridNum, gridNum] // 随机生成的食物坐标
    }

    start(speed, mode) {
        this.speed = speed
        this.mode = mode
        this.setGameTime()
        this.setGameScore()
        this.initCoordinates()
        this.initSnakeCoordinates()
        this.draw()
        this.generateFood()
        this.autoMove()
        this.controlDirection()
    }

    initCoordinates() {
        for (let i = 0; i < this.gridNum; i++) {
            for (let j = 0; j < this.gridNum; j++) {
                this.coordinates.push(`S${j + 1}_${i + 1}`)
            }
        }
    }

    // 设置游戏时间
    setGameTime() {
        timeBox.innerText = '时间：0秒'
        setInterval(() => {
            timeBox.innerText = `时间：${_.formatDate(++this.time)}`
        }, 1000)
    }

    // 设置游戏分数
    setGameScore(isInit = true) {
        if (!isInit) {
            this.score++
        }
        // 通关没测，理论上或许能通关吧
        if (this.score === this.highestScore) {
            clearInterval(this.timer)
            this.overHandler('恭喜你，游戏通关！！！')
        }
        scoreBox.innerText = `分数：${this.score}`
    }

    // 初始时蛇占用 3 个坐标，随机生成一个蛇头坐标，推断出另外两个坐标
    initSnakeCoordinates() {
        const {gridNum} = this
        const x = _.random(5, gridNum - 5)
        const y = _.random(5, gridNum - 5)
        this.snakeHead = [x, y]
        for (let i = 0; i < 3; i++) {
            this.snakeCoordinates.push(`S${x}_${y - i}`)
        }
        this.updateCoordinates()
    }

    // 移除 棋盘可用的坐标 中 被 蛇占用的坐标
    updateCoordinates() {
        this.snakeCoordinates.forEach(item => {
            const index = this.coordinates.findIndex(subItem => subItem === item)
            index > -1 && this.coordinates.splice(index, 1)
        })
    }

    // 绘制蛇
    draw() {
        this.snakeCoordinates.forEach((className, index) => {
            const snakeItem = document.querySelector(`.${className}`)
            if (index === 0) {
                snakeItem.classList.add('head')
            }
            !snakeItem.classList.contains('snake') && snakeItem.classList.add('snake')
        })
    }

    // 粗暴移除所有格子的样式
    removeAll() {
        document.querySelectorAll('.square').forEach(item => {
            item.classList.remove('snake', 'head')
        })
    }

    // 生成食物（从可用的坐标中随机取一个）
    generateFood() {
        const {length} = this.coordinates
        const num = _.random(0, length - 1)
        const className = this.coordinates[num]
        const [x, y] = _.getCoordinate(className)
        this.foodCoordinate = [+x, +y]
        document.querySelector('.food') && document.querySelector('.food').classList.remove('food')
        document.querySelector(`.${className}`).classList.add('food')
    }

    // 蛇头下一个坐标
    nextSnakeHead([x, y]) {
        const result = {
            ArrowUp: [x, y - 1],
            ArrowRight: [x + 1, y],
            ArrowDown: [x, y + 1],
            ArrowLeft: [x - 1, y]
        }
        return result[this.direction]
    }

    // 更新蛇占用的坐标
    updateSnakeCoordinates() {
        // 下一个蛇头坐标
        const [x, y] = this.nextSnakeHead(this.snakeHead)
        const nextSnakeHeadClass = `S${x}_${y}`
        if (this.mode === 'normal' && this.snakeCoordinates.includes(nextSnakeHeadClass)) {
            clearInterval(this.timer)
            this.overHandler('你撞到自己了，游戏结束')
        }
        // 删除老的蛇头坐标
        this.snakeCoordinates.pop()
        // 加入新的蛇头坐标
        this.snakeCoordinates.unshift(nextSnakeHeadClass)
        this.snakeHead = [x, y]
    }

    // 碰撞检测（判断坐标在不在棋盘内）
    impactChecking() {
        const {snakeHead: [x, y], gridNum} = this
        const condition = !_.inRange(x, [1, gridNum]) || !_.inRange(y, [1, gridNum])
        if (condition) {
            clearInterval(this.timer)
            this.overHandler('你撞到边界了，游戏结束')
        } else {
            this.removeAll()
            this.draw()
            this.eat()
        }
    }

    // 控制方向
    controlDirection() {
        document.addEventListener('keydown', ({code}) => {
            if (Snake.keyCodes.includes(code)) {
                this.direction = code
            }
        })
    }

    // 判断蛇头坐标和食物坐标相等，吃到食物
    eat() {
        const {foodCoordinate, snakeHead, snakeCoordinates} = this
        if (_.isEqual(foodCoordinate, snakeHead)) {
            const lastItem = snakeCoordinates[snakeCoordinates.length - 1]
            this.growUp(_.getCoordinate(lastItem))
        }
    }

    // 成长（吃到食物，往 蛇占用的坐标 塞一个坐标，该坐标需要 在边界以内&蛇身以外）
    growUp([x, y]) {
        x = Number(x)
        y = Number(y)
        const {snakeCoordinates, gridNum} = this
        const coordinates = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]
        const result = coordinates.find(arr => {
            const className = `S${arr[0]}_${arr[1]}`
            return !snakeCoordinates.includes(className) && _.inRange(arr[0], [1, gridNum]) && _.inRange(arr[1], [1, gridNum])
        })
        this.snakeCoordinates.push(`S${result[0]}_${result[1]}`)
        this.updateCoordinates()
        this.draw()
        this.generateFood()
        this.setGameScore(false)
    }

    // 移动
    move() {
        this.updateSnakeCoordinates()
        this.impactChecking()
    }

    autoMove() {
        this.timer = setInterval(() => {
            this.move()
        }, this.speed)
    }
}

// 贪吃蛇
class GreedySnake {
    constructor(checkerboard, snake) {
        new checkerboard(checkerboardContainer, GRID_NUM)
        this.snake = new snake(GRID_NUM, this.gameOver)
        this.mode = 'normal' // 游戏模式  正常模式normal|无限模式unlimited
        this.difficulty = 500 // 游戏难度
        this.init()
    }

    init() {
        this.play()
        this.chooseDifficulty()
        this.chooseMode()
    }

    // 开始游戏
    play() {
        playBtn.addEventListener('click', ({target}) => {
            if (target.innerText === '开始') {
                this.snake.start(this.difficulty, this.mode)
                target.innerText = '重开'
                difficultySelect.toggleAttribute('disabled')
                modeSelect.toggleAttribute('disabled')
            } else {
                location.reload()
            }
        })
    }

    // 难度选择
    chooseDifficulty() {
        difficultySelect.addEventListener('change', ({target}) => {
            const selectedOption = target[target.selectedIndex]
            this.difficulty = Number(selectedOption.value)
        })
    }

    // 模式选择
    chooseMode() {
        modeSelect.addEventListener('change', ({target}) => {
            const selectedOption = target[target.selectedIndex]
            this.mode = selectedOption.value
            console.log(this.mode);
        })
    }

    // 游戏结束提示
    gameOver(text) {
        notifyBox.innerHTML = text
        notifyBox.classList.add('center')
    }
}

new GreedySnake(Checkerboard, Snake)
