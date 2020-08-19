var neo = {
        url: 'http://13.79.232.10:7475'
    };

var idTermArray = new Array();
var articlesMap = new Array();
var ontologyName = '';
var ontologyColor = '';
var recordsQuantityTableArticle = 0;
var recordsQuantityParagraph = 0;
var pagesQuantityTableArticle = 0;
var skipTableArticle = 0;
var limitTableArticle = 2;
var conditionsFullArticles = '';
var skipParagraph = 0;
var limitParagraph = 1;
var idTermQuery = '';
var idArticleQuery = '';

parserNeo4jResult = function(res){
    var list = new Array();
    $.each(res.results[0].data, function (k, v) {
        var obj = {};
        $.each(v.row, function (k2, v2) {
            obj["name"] = v2.name;
            obj["id"] = v2.id;
            obj["color"] = $(".icon-ontology").css("background-color");
        });                            
        var metaArray = new Array();
        var meta = {};
        $.each(v.meta, function (k2, v2) {
            meta["id"] = v2.id;
            meta["type"] = v2.type;
            meta["deleted"] = v2.deleted
            metaArray.push(meta);
        });
        obj.meta = metaArray;
        list.push(obj);
    });
    var results = JSON.stringify(list);
    return JSON.parse(results);
};

$(function () {
    // AutoComplete
    $('.ontology2AutoComplete').autoComplete({
        resolver: 'custom',
        formatResult: function (item) {
            
            return {                   
                value: item.id,                            
                text: item.name
                /*html: [
                        $('<img>').attr('src', 'esculapio.png').css("height", 18), ' ',
                        item.name
                    ]*/
            };
        },
        events: {
            search: function (qry, callback) {
                $.ajax({
                        url: neo.url + "/db/data/transaction/commit",
                        type: 'POST',
                        data: JSON.stringify({ "statements": [{ "statement": "CALL db.index.fulltext.queryNodes('termIndex', '"+qry+"~') YIELD node, score WITH node, score MATCH (node)-[:from_ontology]->(o:Ontology {name: '"+$('#button-combo-ontology').text()+"'}) RETURN node ORDER BY score DESC LIMIT 10" }] }),
                        contentType: 'application/json;charset=UTF-8',
                        accept: 'application/json'                
                    }
                ).done(function (res) {
                    var results = parserNeo4jResult(res);                                
                    callback(results)
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
                    $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>')
                });
            }
        }
    });
    $('.ontology2AutoComplete').on('autocomplete.select', function (evt, item) {
        buildTagTerm(item);
    });
});

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

function setRandomColor(id, color) {
  $(".badge-"+id).css("background-color", color);
  $(".badge-"+id).css("color", "#fff");
};

function removeBadge(id){
    var idTerm = $('span.badge-'+id).attr('idterm');
    var i = idTermArray.indexOf(idTerm);
    if (i !== -1) {
        //Se borra elemento del array
        idTermArray.splice( i, 1 );
    }
    $('span').remove('.badge-'+id); 
}

function buildTagTerm(item){
    var idTerm = item.id;
    var id = item.meta[0].id;
    var color = item.color;
    if(document.querySelector(".badge-"+id) == null){
        idTermArray.push(idTerm);
        var htmlSpanString = "<span class='badge badge-pill badge-"+id+" badge-name' idterm='"+idTerm+"'>";
        htmlSpanString += item.name+"<a href='#' class='badge badge-"+id+" close-badge-"+id+"'>x</a>";
        htmlSpanString += "</span>";
        $("#groupTerms").append(htmlSpanString);
        setRandomColor(id, color);
        $(".close-badge-"+id).attr("onclick", "removeBadge("+id+")");
    }
};

function getConditions2Articles(idArray){
    var conditions = '[';
    var parameters = '';
    $.each(idArray, function(k, v){
        parameters += "'"+v+"',"
    });
    parameters = parameters.substring(0, parameters.length-1);
    conditions += parameters +']'

    return conditions;
};

function executeQueryPreview(){
    var conditions = getConditions2Articles(idTermArray); 
    $.each($('span.badge-name'), function (k, v) {
        v.getAttribute('idterm');
        v.style.backgroundColor;
    });
    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "Match (t:Term)<-[*..2]-(a:Article) WHERE (t.id IN "+conditions+") WITH a, COUNT(a) as articleCount MATCH (a)-[:has_metadata_annotations]->(annotation:Term)-[:from_ontology]->(o:Ontology) RETURN sum(articleCount) as totalArticles, o as ontology, collect(distinct(annotation)) as annotations" }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json'                                            
        }
    ).done(function (res) {
        buildTermsCloud(res);
        showExecuteQueryButton();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function buildTermsCloud(res){
    var ontologyNameCloud = '';
    var list = new Array();
    $.each(res.results[0].data, function (k, v) {
        ontologyNameCloud = v.row[1].name;
        $.each(v.row[2], function (b, a) {
            var annotation = [a.name, 20, a.id, ontologyNameCloud];
            list.push(annotation);
        });
    });
    executeTermsCloud(list);
};

function executeTermsCloud(list){
    var ontoName = '';
    WordCloud($('.card-body .terms-cloud')[0], { 
        list: list,
        color: function(word, weight, item){
            $.each(list, function (b, a) {
                if (word == a[0]) {
                    ontoName = a[3];
                    return false;
                }
            });
            return $('#option-'+ontoName).attr('ontology-color');
        },
        click: function(item) {
                console.log(item[0] + ': ' + item[3]);
              } 
    });
};

function executeQueryArticles(){
    var conditions = getConditions2Articles(idTermArray);
    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "Match (t:Term)<-[*..2]-(a:Article) WHERE (t.id IN "+conditions+") WITH a RETURN collect(distinct(a.id)) as Article" }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json'                                            
        }
    ).done(function (res) {
        executeQueryFullArticles(res, skipTableArticle);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function executeQueryFullArticles(res, skip){

    $.each(res.results[0].data, function (j, v) {
        var listIdArticles = v.row[0];
        recordsQuantityTableArticle = listIdArticles.length;
        pagesQuantityTableArticle = Math.ceil(recordsQuantityTableArticle/limitTableArticle);
        conditionsFullArticles = getConditions2Articles(listIdArticles);
    });

    statementFullArticles(conditionsFullArticles, skip);
};

function executePaginationFullArticles(button){
    if ("rightButtonArticleTable" === button.id) {
        skipTableArticle += limitTableArticle;
    }

    if ("leftButtonArticleTable" === button.id) {
        skipTableArticle -= limitTableArticle;   
    }
    //statusPaginationTableArticles();
    statementFullArticles(conditionsFullArticles, skipTableArticle);
}

function statementFullArticles(conditions, skip){

    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "MATCH (article:Article) WHERE article.id IN "+conditions+" WITH article "+
                                                                 "MATCH (author:Author)<-[:has_author]-(article) WITH article, COLLECT(author) as authors "+
                                                                 "MATCH (abstract:Paragraph)<-[:has_abstract]-(article) WITH article, authors, COLLECT(abstract) as abstracts "+
                                                                 "MATCH (bodytext:Paragraph)<-[:has_bodytext]-(article) WITH article, authors, abstracts, bodytext "+
                                                                 "ORDER BY bodytext.position ASC WITH article, authors, abstracts, COLLECT(bodytext) as bodytexts "+
                                                                 "MATCH (backmatter:Paragraph)<-[:has_back_matter]-(article) WITH article, authors, abstracts, bodytexts, "+
                                                                 "COLLECT(backmatter) as backmatters MATCH (bibEntry:BibEntry)<-[:has_bibentry]-(article) "+
                                                                 "RETURN article, authors, abstracts, bodytexts, backmatters, COLLECT(bibEntry) as bibEntries SKIP "+skip+" LIMIT "+limitTableArticle }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json',
            beforeSend: function() {
                  $('.table-article').loading({
                        start: true,
                        message: 'LOADING ARTICLES...'
                    });
            },
            success: function(){
                $('.table-article').loading('stop');
            }                                            
        }
    ).done(function (res) {
        buildTableArticles(res);
        showArticlesTable();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function buildTableArticles(res){
    var htmlString = '';
    var conditions = '';
    var listDocuments = new Array();
    $('#bodyTableArticles').html("");
    $('.article-cloud').html('');
    $.each(res.results[0].data, function (j, v) {
        var documentArticle = {};
        //var author = {};
        var abstract = {};
        var listAuthor = new Array();
        documentArticle["idArticle"] = v.row[0].id;
        documentArticle["title"] = v.row[0].title;
        $.each(v.row[1], function (k, w) {
            var author = {};
            author["firstName"] = w.first;
            author["lastName"] = w.last;
            author["email"] = w.email;
            listAuthor.push(author);
        });
        documentArticle["authors"] = listAuthor;
        $.each(v.row[2], function (k, w) {
            abstract["section"] = w.section;
            abstract["text"] = w.text;
        });
        documentArticle["abstract"] = abstract;
        listDocuments.push(documentArticle);
    });

    $.each(listDocuments, function (j, doc) {
        htmlString += "<table class='table card-text'>"
        htmlString += "<thead><tr><th>Title</th><th>Abstract</th><th>Cloud Terms</th></tr></thead>";
        htmlString += "<tbody>"
        htmlString += "<tr>";
        htmlString += "<td>" + doc.title + "<small class='form-text text-muted ml-3'><div id='authors-"+doc.idArticle+"'>";
        htmlString += "<dl><dt><strong>Authors:</strong></dt><dd>";
        $.each(doc.authors, function (k, auth) {
            htmlString += "<i class='fas fa-user-circle'></i><em>"+auth.lastName+", "+auth.firstName+"</em>";
            if (!(!auth.email || 0 === auth.email.length)) {
                htmlString += "<em> <strong>mail:</strong> </em><a href='mailto:"+auth.email+"'>"+auth.email+"</a><br>";
            }else{
                htmlString += "<br>";
            }
        });
        htmlString += "</dd></dl></div></small></td>";
        htmlString += "<td><textarea readonly cols='50' rows='5' style='resize: none;overflow:auto;'>"+doc.abstract.text+"</textarea></td>";
        //htmlString += "<td><button id='button-cloud-"+doc.idArticle+"' type='button' class='btn btn-primary'><i class='fa fa-cloud'></i></button></td>";
        htmlString += "<td rowspan='2'><div class='card-body'><div class='article-cloud-"+doc.idArticle+"' style='height: 450px; width: 400px;'></div></div></td>";
        htmlString += "</tr>";
        htmlString += "<tr>";
        htmlString += "<td colspan='2' class='paragraph-block-"+doc.idArticle+"'></td>"
        htmlString += "</tr>";
        htmlString += "</tbody>";
        htmlString += "</table>";
        $('#bodyTableArticles').append(htmlString);
        //$('#button-cloud-'+doc.idArticle).attr('onclick', 'executeQueryArticleTermsCloud("'+doc.idArticle+'")');
        htmlString = '';
        executeQueryArticleTermsCloud(doc.idArticle);
    });
    //initTooltips();
    hiddenExecuteQueryButton();
    statusPaginationTableArticles();
};

function executeQueryArticleTermsCloud(idArticle){

    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "Match (t:Term)<-[r:has_annotations]-(p:Paragraph)<-[*..2]-(a:Article {id:'"+idArticle+"'}) RETURN collect(distinct(t))" }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json'/*,
            beforeSend: function() {
                //showArticleTermsCloud();
                $('.article-terms-cloud').loading({
                    start: true,
                    message: 'LOADING CLOUD...'
                });
            },
            success: function(){
                $('.article-terms-cloud').loading('stop');
            }*/                                            
        }
    ).done(function (res) {
        buildArticleTermsCloud(res, idArticle);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function buildArticleTermsCloud(res, idArticle){
    var ontologyNameCloud = '';
    var list = new Array();
    $.each(res.results[0].data, function (k, v) {
        $.each(v.row[0], function (b, a) {
            var annotation = [a.name, 10, a.id, idArticle];
            list.push(annotation);
        });
    });
    executeArticleTermsCloud(list, idArticle);
};

function executeArticleTermsCloud(list, idArticle){
    WordCloud($('.card-body .article-cloud-'+idArticle)[0], { 
        list: list,
        click: function(item) {
            //showParagraphSection();
            executeQueryParagraph(item[2], item[3]);
            }/*, 
        hover: function(item) {
            console.log(item[0] + ': '+item[2]+', '+ item[3]);
            }*/    
    });
};

function executePaginationFullParagraph(button){
    var idArticleToSkip = button.id.split("-")[1];
    var idTermToSkip = $('#termParagraphValue-'+idArticleToSkip).val();
    skipParagraph = parseInt($('#skipParagraphValue-'+idArticleToSkip).val(), 10);
    recordsQuantityParagraph = parseInt($('#recordsQuantity-'+idArticleToSkip).val(), 10);
    if ("rightButtonParagraph-"+idArticleToSkip === button.id) {
        skipParagraph += limitParagraph;
    }

    if ("leftButtonParagraph-"+idArticleToSkip === button.id) {
        skipParagraph -= limitParagraph;   
    }
    statementFullParagraph(idTermToSkip, idArticleToSkip, skipParagraph);
}

function executeQueryParagraph(idTerm, idArticle){

    idTermQuery = idTerm;
    idArticleQuery = idArticle
    skipParagraph = 0;
    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "Match (t:Term {id:'"+idTerm+"'})<-[r:has_annotations]-(p:Paragraph)<-[*..2]-(a:Article {id:'"+idArticle+"'}) "+
                                                                 "WITH distinct(p) as paragraphs RETURN count(paragraphs) as count" }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json'                                            
        }
    ).done(function (res) {
        executeQueryFullParagraph(res, idTerm, idArticle, skipParagraph);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function executeQueryFullParagraph(res, idTerm, idArticle, skip){
    
    recordsQuantityParagraph = res.results[0].data[0].row[0];
    statementFullParagraph(idTerm, idArticle, skip);
};

function statementFullParagraph(idTerm, idArticle, skip){

    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "Match (t:Term {id:'"+idTerm+"'})<-[r:has_annotations]-(p:Paragraph)<-[*..2]-(a:Article {id:'"+idArticle+"'}) "+
                                                                 "RETURN t, p, COLLECT(r) as spans ORDER BY p.position ASC "+
                                                                 "SKIP "+skip+" LIMIT "+limitParagraph }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json',
            beforeSend: function() {
                  $('.paragraph-block-'+idArticle).loading({
                        start: true,
                        message: 'LOADING PARAGRAPH...'
                    });
            },
            success: function(){
                $('.paragraph-block-'+idArticle).loading('stop');
            }                                            
        }
    ).done(function (res) {
        buildParagraphSection(res, idTerm, idArticle, skip);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>');
    });
};

function buildParagraphSection(res, idTerm, idArticle, skip){
    var htmlString = '';
    //$('.paragraph-header').html("");
    $('.paragraph-block-'+idArticle).html("");
    $.each(res.results[0].data, function (j, v) {
    htmlString += "<div><h6>"+v.row[0].name+"</h6></div>";
    htmlString += "<div><textarea readonly cols='86' rows='10' style='resize: none;overflow:auto;'>"+v.row[1].text+"</textarea></div>";
    htmlString += "<div class='d-flex justify-content-between'>";
    htmlString += "<button id='leftButtonParagraph-"+idArticle+"' type='button' class='btn btn-primary' onclick='executePaginationFullParagraph(this)'><i class='fa fa-arrow-left'></i></button>";
    htmlString += "<input id='termParagraphValue-"+idArticle+"' type='hidden' value='"+idTerm+"'>";
    htmlString += "<input id='skipParagraphValue-"+idArticle+"' type='hidden' value="+skip+">";
    htmlString += "<input id='recordsQuantity-"+idArticle+"' type='hidden' value="+recordsQuantityParagraph+">";
    htmlString += "<button id='rightButtonParagraph-"+idArticle+"' type='button' class='btn btn-primary' onclick='executePaginationFullParagraph(this)'><i class='fa fa-arrow-right'></i></button>";
    htmlString += "</div>";
    $('.paragraph-block-'+idArticle).append(htmlString);
    });
    statusPaginationParagraph(idArticle);
}

function closeTableArticles(){
    hiddenArticlesTable();
    showGroupTerms();
    showQueryPreview();
    showExecuteQueryButton();
};

function initTooltips(){
    tippy('#toolTips', {
      content(reference) {
        const id = reference.getAttribute('data-template');
        const template = document.getElementById(id);
        return template.innerHTML;
      },
      allowHTML: true,
      interactive: true,
      followCursor: true,
      theme: 'light-border',
    });
};

function executeQueryOntologies(){
    $.ajax({
            url: neo.url + "/db/data/transaction/commit",
            type: 'POST',
            data: JSON.stringify({ "statements": [{ "statement": "MATCH (o:Ontology) RETURN o ORDER BY o.name DESC" }] }),
            contentType: 'application/json;charset=UTF-8',
            accept: 'application/json',
            beforeSend: function() {
                  $('body').loading({
                        start: true,
                        message: 'LOADING ONTOLOGIES...'
                    });
            },
            success: function(){
                $('body').loading('stop');
            }               
        }
    ).done(function (res) {
        buildComboOntologies(res);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        $('body').loading('stop');
        console.log("Ha ocurrido un error en la consulta -> "+textStatus+": "+errorThrown);
        $('#messageArea').html('<h3>' + textStatus + ' : ' + errorThrown + '</h3>')
    });
};

function buildComboOntologies(res){
    var htmlOptions = '';
    $.each(res.results[0].data, function (k, v) {
        ontologyName = v.row[0].name;
        ontologyColor = getRandomColor();
        htmlOptions += "<a id='option-"+ontologyName+"' href='#' class='dropdown-item' ontology-color='"+ontologyColor+"'>"+ontologyName+"</a>"
        $('#comboOntology').append(htmlOptions);
        $("#option-"+ontologyName).attr("onclick", "buildInput2Ontologies('"+ontologyName+"','"+ontologyColor+"')");
        htmlOptions = '';
    });
    showTypeHead();
};

function statusPaginationTableArticles(){
    if (skipTableArticle === 0) {
        $('#leftButtonArticleTable').attr('disabled', true);
        $('#leftButtonArticleTable').attr('class', 'btn btn-secondary');
    }else{
        $('#leftButtonArticleTable').attr('disabled', false);
        $('#leftButtonArticleTable').attr('class', 'btn btn-primary');
    }

    if ((skipTableArticle + limitTableArticle) >= recordsQuantityTableArticle) {
        $('#rightButtonArticleTable').attr('disabled', true);
        $('#rightButtonArticleTable').attr('class', 'btn btn-secondary');
    }else{
        $('#rightButtonArticleTable').attr('disabled', false);
        $('#rightButtonArticleTable').attr('class', 'btn btn-primary');
    }
};

function statusPaginationParagraph(idArticle){
    var recordsQuantity = parseInt($('#recordsQuantity-'+idArticle).val(), 10);
    if (skipParagraph === 0) {
        $('#leftButtonParagraph-'+idArticle).attr('disabled', true);
        $('#leftButtonParagraph-'+idArticle).attr('class', 'btn btn-secondary');
    }else{
        $('#leftButtonParagraph-'+idArticle).attr('disabled', false);
        $('#leftButtonParagraph-'+idArticle).attr('class', 'btn btn-primary');
    }

    if ((skipParagraph + limitParagraph) >= recordsQuantity) {
        $('#rightButtonParagraph-'+idArticle).attr('disabled', true);
        $('#rightButtonParagraph-'+idArticle).attr('class', 'btn btn-secondary');
    }else{
        $('#rightButtonParagraph-'+idArticle).attr('disabled', false);
        $('#rightButtonParagraph-'+idArticle).attr('class', 'btn btn-primary');
    }
};

function buildInput2Ontologies(ontology, color){
    $("#button-combo-ontology").html(ontology);
    $(".icon-ontology").css("background-color", color);
    $(".ontology2AutoComplete").val("");
};

function initComponents(){
    executeQueryOntologies();
    hiddenComponents();
};

function hiddenComponents(){
    hiddenArticlesTable();
    hiddenArticleAbstract();
    hiddenTypeHead();
    hiddenExecuteQueryButton();
    hiddenParagraphSection();
};

function showArticlesTable(){
    hiddenGroupTerms();
    hiddenQueryPreview();
    hiddenArticleTermsCloud();
    hiddenParagraphSection();
    $('.section-table-article').show('slow');
};

function hiddenArticlesTable(){
    $('.section-table-article').hide();
};

function showParagraphSection(){
    $('.paragraph-block').show('slow');
}

function hiddenParagraphSection(){
    $('.paragraph-block').hide();
}

function showArticleTermsCloud(){
    $('.article-terms-cloud').show('slow');
};

function hiddenArticleTermsCloud(){
    $('.article-terms-cloud').hide();
};

function showQueryPreview(){
    $('.query-preview').show('slow');
};

function hiddenQueryPreview(){
    $('.query-preview').hide();
};

function showArticleAbstract(section, text){
    $("#modalAbstractTitle").html(section);
    $("#modalAbstractText").html(text);
};

function hiddenArticleAbstract(){
    $('.card-abstract').hide();
};

function showTypeHead(){
    $('.type-head').show('slow');
    showGroupTerms();
    showQueryPreview();
};

function hiddenTypeHead(){
    $('.type-head').hide();
    hiddenGroupTerms();
    hiddenQueryPreview();
};

function showGroupTerms(){
     $('.group-terms').show('slow');
};

function hiddenGroupTerms(){
    $('.group-terms').hide();
};

function showExecuteQueryButton(){
    $('.executeQuery').show('slow');
};

function hiddenExecuteQueryButton(){
    $('.executeQuery').hide();
};