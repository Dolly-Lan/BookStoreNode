var express = require('express');
var http = require('http');
var monk = require('monk');

//配置express
var app = express();
app.set('port',3001);
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


