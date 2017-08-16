var express = require('express');
var http = require('http');
var monk = require('monk');
var bodyParser=require('body-parser');

//配置express
var app = express();
app.set('port',3001);
app.use(bodyParser.json());//需使用该方法，否则req.body为空对象
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "content-type");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    if(req.method == "OPTIONS") {
        res.send("200");
    } else {
        next();
    }
});

//启动express服务
http
    .createServer(app)
    .listen(app.get('port'), function() {
        console.log('Express server listening on port ' + app.get('port'));
    });

//连接mongodb
var db = monk('localhost:27017/BookStore');

//配置路由
app.get('/books/:curPage/:pageSize',list);
app.get('/books/:curPage/:pageSize/:search',search);
app.delete('/books/del/:id',del);
app.post('/books/add/',add);

function list(req, res) {
    var booksCollection = db.get('books');
    var limit = parseInt(req.params.pageSize?req.params.pageSize:1);
    var curPage = parseInt(req.params.curPage?req.params.curPage:1);
    var data = {};
    booksCollection
        .count()
        .then((docs)=>{
            data.pages = Math.ceil(docs/limit);
            data.curPage = curPage;
            data.pageSize = limit;
            return booksCollection.find({},{limit:limit,skip:(curPage-1)*limit})
        })
        .then((docs) => {
            data.books = docs;
            res.json(data);
        });
};

function search(req,res){
    var booksCollection = db.get('books');
    var limit = parseInt(req.params.pageSize?req.params.pageSize:1);
    var curPage = parseInt(req.params.curPage?req.params.curPage:1);
    var searchStr = {};
    var data = {};
    searchStr = function () {
        var obj = {};
        if(req.params.search){
            obj = {name:new RegExp(req.params.search)}  //对name字段支持“模糊查询”
        }
        return obj;
    }();
    booksCollection
        .find(searchStr,{"_id":0,limit:limit,skip:(curPage-1)*limit})
        .then((docs) =>{
            data.books = docs;
            data.curPage = curPage;
            data.pageSize = limit;
            return booksCollection.find(searchStr)
        })
        .then((docs)=>{
            data.pages = Math.ceil(docs.length/limit);
            res.json(data);
        })
}

function del(req,res) {
    var booksCollection = db.get('books');
    booksCollection
        .remove({id:parseInt(req.params.id)})
        .then(()=>{
            res.json({"code":0});
        });
}

function add(req,res) {
    var booksCollection = db.get('books');
    var data = {};
    booksCollection
        .findOne({},{sort: {id: -1}}) //找到当前最书籍中最大ID，sort:{id:-1}表示降序排序
        .then((docs)=>{
            var book = req.body;
            book.id = (parseInt(docs.id)+1);  //自动生成新增ID:最大id基础上加1
            return booksCollection.insert(book)
        })
        .then((docs)=>{
            data.code = 0;
            res.json(data);
        })
}


